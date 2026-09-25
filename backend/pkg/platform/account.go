package platform

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrAccountExists      = errors.New("account exists")
	ErrAccountLocked      = errors.New("account temporarily locked")
)

type Account struct {
	ID          string     `json:"id"`
	Username    string     `json:"username"`
	FullName    string     `json:"fullName"`
	CreatedAt   time.Time  `json:"createdAt"`
	LastLoginAt *time.Time `json:"lastLoginAt,omitempty"`
}

func NormalizeUsername(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func ValidUsername(value string) bool {
	if len(value) < 3 || len(value) > 40 {
		return false
	}
	for _, char := range value {
		if !(char >= 'a' && char <= 'z' || char >= '0' && char <= '9' || char == '_' || char == '.' || char == '-') {
			return false
		}
	}
	return true
}

func newRandomHex(size int) (string, error) {
	value := make([]byte, size)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return hex.EncodeToString(value), nil
}

func sessionHash(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func newSession(remember bool) (string, int, error) {
	maxAge := 24 * 60 * 60
	if remember {
		maxAge = 30 * 24 * 60 * 60
	}
	token, err := newRandomHex(32)
	if err != nil {
		return "", 0, err
	}
	return token, maxAge, nil
}

func (s *Store) createSession(ctx context.Context, userID string, remember bool) (string, int, error) {
	token, maxAge, err := newSession(remember)
	if err != nil {
		return "", 0, err
	}
	_, err = s.pool.Exec(ctx, `INSERT INTO budgetyar_sessions (token_hash, user_id, expires_at)
		VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 second'))`, sessionHash(token), userID, maxAge)
	return token, maxAge, err
}

func (s *Store) RegisterAccount(ctx context.Context, username, password, fullName string, remember bool) (Account, string, int, error) {
	hash, err := hashPassword(password)
	if err != nil {
		return Account{}, "", 0, err
	}
	id, err := newRandomHex(16)
	if err != nil {
		return Account{}, "", 0, err
	}
	id = "user-" + id
	token, maxAge, err := newSession(remember)
	if err != nil {
		return Account{}, "", 0, err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Account{}, "", 0, err
	}
	defer tx.Rollback(ctx)
	var account Account
	err = tx.QueryRow(ctx, `INSERT INTO budgetyar_users (id, username, full_name, password_hash, last_login_at)
		VALUES ($1, $2, $3, $4, NOW()) RETURNING id, username, full_name, created_at, last_login_at`,
		id, username, fullName, hash).Scan(&account.ID, &account.Username, &account.FullName, &account.CreatedAt, &account.LastLoginAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return Account{}, "", 0, ErrAccountExists
		}
		return Account{}, "", 0, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO budgetyar_sessions (token_hash, user_id, expires_at)
		VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 second'))`, sessionHash(token), account.ID, maxAge)
	if err != nil {
		return Account{}, "", 0, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Account{}, "", 0, err
	}
	return account, token, maxAge, nil
}

func (s *Store) LoginAccount(ctx context.Context, username, password string, remember bool) (Account, string, int, error) {
	var lockedUntil *time.Time
	err := s.pool.QueryRow(ctx, `SELECT locked_until FROM budgetyar_login_attempts WHERE username = $1`, username).Scan(&lockedUntil)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return Account{}, "", 0, err
	}
	if lockedUntil != nil && lockedUntil.After(time.Now()) {
		return Account{}, "", 0, ErrAccountLocked
	}
	var account Account
	var hash string
	err = s.pool.QueryRow(ctx, `SELECT id, username, full_name, created_at, last_login_at, password_hash
		FROM budgetyar_users WHERE username = $1`, username).Scan(
		&account.ID, &account.Username, &account.FullName, &account.CreatedAt, &account.LastLoginAt, &hash)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && !passwordMatchesHash(hash, password) {
		_, attemptErr := s.pool.Exec(ctx, `INSERT INTO budgetyar_login_attempts (username, failed_count, updated_at)
			VALUES ($1, 1, NOW()) ON CONFLICT (username) DO UPDATE SET
			failed_count = CASE WHEN budgetyar_login_attempts.updated_at < NOW() - INTERVAL '15 minutes'
				THEN 1 ELSE budgetyar_login_attempts.failed_count + 1 END,
			locked_until = CASE WHEN budgetyar_login_attempts.updated_at >= NOW() - INTERVAL '15 minutes'
				AND budgetyar_login_attempts.failed_count >= 4 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END,
			updated_at = NOW()`, username)
		if attemptErr != nil {
			return Account{}, "", 0, attemptErr
		}
		return Account{}, "", 0, ErrInvalidCredentials
	}
	if err != nil {
		return Account{}, "", 0, err
	}
	if _, err = s.pool.Exec(ctx, `DELETE FROM budgetyar_login_attempts WHERE username = $1`, username); err != nil {
		return Account{}, "", 0, err
	}
	err = s.pool.QueryRow(ctx, `UPDATE budgetyar_users SET last_login_at = NOW() WHERE id = $1 RETURNING last_login_at`, account.ID).Scan(&account.LastLoginAt)
	if err != nil {
		return Account{}, "", 0, err
	}
	token, maxAge, err := s.createSession(ctx, account.ID, remember)
	return account, token, maxAge, err
}

func (s *Store) AccountForSession(ctx context.Context, token string) (Account, error) {
	if len(token) != 64 {
		return Account{}, ErrInvalidCredentials
	}
	var account Account
	err := s.pool.QueryRow(ctx, `SELECT u.id, u.username, u.full_name, u.created_at, u.last_login_at
		FROM budgetyar_sessions s JOIN budgetyar_users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > NOW()`, sessionHash(token)).Scan(
		&account.ID, &account.Username, &account.FullName, &account.CreatedAt, &account.LastLoginAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Account{}, ErrInvalidCredentials
	}
	return account, err
}

func (s *Store) LogoutAccount(ctx context.Context, token string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM budgetyar_sessions WHERE token_hash = $1`, sessionHash(token))
	return err
}

func (s *Store) UpdateAccountName(ctx context.Context, userID, fullName string) (Account, error) {
	var account Account
	err := s.pool.QueryRow(ctx, `UPDATE budgetyar_users SET full_name = $2 WHERE id = $1
		RETURNING id, username, full_name, created_at, last_login_at`, userID, fullName).Scan(
		&account.ID, &account.Username, &account.FullName, &account.CreatedAt, &account.LastLoginAt)
	return account, err
}

func (s *Store) ChangeAccountPassword(ctx context.Context, userID, token, oldPassword, newPassword string) error {
	var oldHash string
	if err := s.pool.QueryRow(ctx, `SELECT password_hash FROM budgetyar_users WHERE id = $1`, userID).Scan(&oldHash); err != nil {
		return err
	}
	if !passwordMatchesHash(oldHash, oldPassword) {
		return ErrInvalidCredentials
	}
	newHash, err := hashPassword(newPassword)
	if err != nil {
		return err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `UPDATE budgetyar_users SET password_hash = $2 WHERE id = $1`, userID, newHash); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM budgetyar_sessions WHERE user_id = $1 AND token_hash <> $2`, userID, sessionHash(token)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Store) DeleteAccount(ctx context.Context, userID, password string) error {
	var hash string
	if err := s.pool.QueryRow(ctx, `SELECT password_hash FROM budgetyar_users WHERE id = $1`, userID).Scan(&hash); err != nil {
		return err
	}
	if !passwordMatchesHash(hash, password) {
		return ErrInvalidCredentials
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `DELETE FROM budgetyar_snapshots WHERE user_id = $1`, userID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM budgetyar_audit_logs WHERE user_id = $1`, userID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM budgetyar_users WHERE id = $1`, userID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
