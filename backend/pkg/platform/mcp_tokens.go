package platform

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type MCPToken struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CanWrite  bool      `json:"canWrite"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
}

func (s *Store) CreateMCPToken(ctx context.Context, userID, name string, canWrite bool, days int) (MCPToken, string, error) {
	if strings.TrimSpace(name) == "" || len([]rune(name)) > 80 || days < 1 || days > 365 {
		return MCPToken{}, "", errors.New("invalid token name or expiry")
	}
	id, err := newRandomHex(16)
	if err != nil {
		return MCPToken{}, "", err
	}
	secret, err := newRandomHex(32)
	if err != nil {
		return MCPToken{}, "", err
	}
	secret = "bymcp_" + secret
	var token MCPToken
	err = s.pool.QueryRow(ctx, `INSERT INTO budgetyar_mcp_tokens (id, user_id, token_hash, name, can_write, expires_at)
 VALUES ($1, $2, $3, $4, $5, NOW() + ($6 * INTERVAL '1 day'))
 RETURNING id, name, can_write, expires_at, created_at`, id, userID, sessionHash(secret), strings.TrimSpace(name), canWrite, days).
		Scan(&token.ID, &token.Name, &token.CanWrite, &token.ExpiresAt, &token.CreatedAt)
	return token, secret, err
}

func (s *Store) ListMCPTokens(ctx context.Context, userID string) ([]MCPToken, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, can_write, expires_at, created_at FROM budgetyar_mcp_tokens
 WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tokens := []MCPToken{}
	for rows.Next() {
		var token MCPToken
		if err := rows.Scan(&token.ID, &token.Name, &token.CanWrite, &token.ExpiresAt, &token.CreatedAt); err != nil {
			return nil, err
		}
		tokens = append(tokens, token)
	}
	return tokens, rows.Err()
}

func (s *Store) RevokeMCPToken(ctx context.Context, userID, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM budgetyar_mcp_tokens WHERE user_id = $1 AND id = $2`, userID, id)
	return err
}

// MCP credentials are separate from both the frontend service secret and account sessions.
func (s *Store) AccountForMCPToken(ctx context.Context, secret string) (string, bool, error) {
	if len(secret) != 70 || !strings.HasPrefix(secret, "bymcp_") {
		return "", false, ErrInvalidCredentials
	}
	var userID string
	var canWrite bool
	err := s.pool.QueryRow(ctx, `SELECT user_id, can_write FROM budgetyar_mcp_tokens
 WHERE token_hash = $1 AND expires_at > NOW()`, sessionHash(secret)).Scan(&userID, &canWrite)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, ErrInvalidCredentials
	}
	return userID, canWrite, err
}
