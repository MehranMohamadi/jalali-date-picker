package platform

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrVersionConflict = errors.New("snapshot version conflict")

type Snapshot struct {
	Version   int64           `json:"version"`
	UpdatedAt time.Time       `json:"updatedAt"`
	Data      json.RawMessage `json:"data"`
}

type Store struct {
	pool *pgxpool.Pool
}

var (
	storeOnce sync.Once
	store     *Store
	storeErr  error
)

func OpenStore(ctx context.Context, databaseURL string) (*Store, error) {
	storeOnce.Do(func() {
		config, err := pgxpool.ParseConfig(databaseURL)
		if err != nil {
			storeErr = err
			return
		}
		config.MaxConns = 2
		config.MinConns = 0
		config.MaxConnIdleTime = 30 * time.Second
		pool, err := pgxpool.NewWithConfig(ctx, config)
		if err != nil {
			storeErr = err
			return
		}
		store = &Store{pool: pool}
	})
	return store, storeErr
}

func (s *Store) LoadSnapshot(ctx context.Context, userID string) (Snapshot, error) {
	var snapshot Snapshot
	err := s.pool.QueryRow(ctx, `
		SELECT version, updated_at, data
		FROM budgetyar_snapshots
		WHERE user_id = $1
	`, userID).Scan(&snapshot.Version, &snapshot.UpdatedAt, &snapshot.Data)
	return snapshot, err
}

func (s *Store) SaveSnapshot(ctx context.Context, userID string, expectedVersion int64, data json.RawMessage) (Snapshot, error) {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Snapshot{}, err
	}
	defer tx.Rollback(ctx)

	var currentVersion int64
	err = tx.QueryRow(ctx, `SELECT version FROM budgetyar_snapshots WHERE user_id = $1 FOR UPDATE`, userID).Scan(&currentVersion)
	if errors.Is(err, pgx.ErrNoRows) {
		if expectedVersion != 0 {
			return Snapshot{}, ErrVersionConflict
		}
		currentVersion = 0
	} else if err != nil {
		return Snapshot{}, err
	} else if currentVersion != expectedVersion {
		return Snapshot{}, ErrVersionConflict
	}

	nextVersion := currentVersion + 1
	var snapshot Snapshot
	err = tx.QueryRow(ctx, `
		INSERT INTO budgetyar_snapshots (user_id, version, data, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (user_id) DO UPDATE
		SET version = EXCLUDED.version, data = EXCLUDED.data, updated_at = NOW()
		RETURNING version, updated_at, data
	`, userID, nextVersion, data).Scan(&snapshot.Version, &snapshot.UpdatedAt, &snapshot.Data)
	if err != nil {
		return Snapshot{}, err
	}
	metadata, _ := json.Marshal(map[string]any{"version": nextVersion})
	if _, err = tx.Exec(ctx, `
		INSERT INTO budgetyar_audit_logs (user_id, action, metadata)
		VALUES ($1, 'snapshot.saved', $2)
	`, userID, metadata); err != nil {
		return Snapshot{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Snapshot{}, err
	}
	return snapshot, nil
}

func (s *Store) Audit(ctx context.Context, userID, action string, metadata any) {
	encoded, err := json.Marshal(metadata)
	if err != nil {
		return
	}
	_, _ = s.pool.Exec(ctx, `
		INSERT INTO budgetyar_audit_logs (user_id, action, metadata)
		VALUES ($1, $2, $3)
	`, userID, action, encoded)
}
