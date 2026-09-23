package handler

import (
	"context"
	"errors"
	"net/http"
	"sync"

	"budgetyar-backend/internal/finance"
	"budgetyar-backend/internal/platform"
	"github.com/jackc/pgx/v5"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type transactionListInput struct {
	From  string `json:"from,omitempty" jsonschema:"start Jalali date in YYYY/MM/DD format"`
	To    string `json:"to,omitempty" jsonschema:"end Jalali date in YYYY/MM/DD format"`
	Type  string `json:"type,omitempty" jsonschema:"optional transaction type: income or expense"`
	Limit int    `json:"limit,omitempty" jsonschema:"maximum number of results from 1 to 100"`
}

type transactionListOutput struct {
	Transactions []finance.Transaction `json:"transactions"`
	Count        int                   `json:"count"`
}

type financeSummaryInput struct {
	From string `json:"from,omitempty" jsonschema:"start Jalali date in YYYY/MM/DD format"`
	To   string `json:"to,omitempty" jsonschema:"end Jalali date in YYYY/MM/DD format"`
}

type budgetListOutput struct {
	Budgets    []finance.Budget  `json:"budgets"`
	Categories map[string]string `json:"categories"`
}

var (
	mcpOnce    sync.Once
	mcpHandler http.Handler
	mcpErr     error
)

func newMCPHandler(cfg platform.Config) (http.Handler, error) {
	store, err := platform.OpenStore(context.Background(), cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	server := mcp.NewServer(&mcp.Implementation{Name: "budgetyar", Version: "0.1.0"}, nil)

	load := func(ctx context.Context) (finance.Snapshot, error) {
		snapshot, err := store.LoadSnapshot(ctx, cfg.UserID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return finance.Snapshot{}, errors.New("no Budgetyar cloud snapshot exists")
			}
			return finance.Snapshot{}, err
		}
		return finance.DecodeSnapshot(snapshot.Data)
	}

	mcp.AddTool(server, &mcp.Tool{
		Name:        "transactions_list",
		Description: "List the authenticated user's Budgetyar transactions. Dates are Jalali YYYY/MM/DD and amounts are toman.",
	}, func(ctx context.Context, _ *mcp.CallToolRequest, input transactionListInput) (*mcp.CallToolResult, transactionListOutput, error) {
		snapshot, err := load(ctx)
		if err != nil {
			return nil, transactionListOutput{}, err
		}
		items := finance.FilterTransactions(snapshot.Transactions, finance.TransactionFilter{
			From: input.From, To: input.To, Type: input.Type, Limit: input.Limit,
		})
		store.Audit(ctx, cfg.UserID, "mcp.transactions_list", map[string]any{"count": len(items)})
		return nil, transactionListOutput{Transactions: items, Count: len(items)}, nil
	})

	mcp.AddTool(server, &mcp.Tool{
		Name:        "finance_summary",
		Description: "Return income, expense, and balance totals for an optional Jalali date range. Amounts are toman.",
	}, func(ctx context.Context, _ *mcp.CallToolRequest, input financeSummaryInput) (*mcp.CallToolResult, finance.Summary, error) {
		snapshot, err := load(ctx)
		if err != nil {
			return nil, finance.Summary{}, err
		}
		output := finance.SummarizeTransactions(snapshot.Transactions, input.From, input.To)
		store.Audit(ctx, cfg.UserID, "mcp.finance_summary", map[string]any{"from": input.From, "to": input.To})
		return nil, output, nil
	})

	mcp.AddTool(server, &mcp.Tool{
		Name:        "budgets_list",
		Description: "List Budgetyar category budgets. Amounts are toman.",
	}, func(ctx context.Context, _ *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, budgetListOutput, error) {
		snapshot, err := load(ctx)
		if err != nil {
			return nil, budgetListOutput{}, err
		}
		labels := make(map[string]string, len(snapshot.Categories))
		for _, category := range snapshot.Categories {
			labels[category.Key] = category.Label
		}
		store.Audit(ctx, cfg.UserID, "mcp.budgets_list", map[string]any{"count": len(snapshot.Budgets)})
		return nil, budgetListOutput{Budgets: snapshot.Budgets, Categories: labels}, nil
	})

	streamable := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server {
		return server
	}, &mcp.StreamableHTTPOptions{
		Stateless:           true,
		JSONResponse:        true,
		MaxRequestBodyBytes: 1 << 20,
	})
	return platform.RequireAuth(cfg, streamable), nil
}

func Handler(w http.ResponseWriter, r *http.Request) {
	cfg, err := platform.LoadConfig()
	if err != nil {
		platform.WriteError(w, http.StatusServiceUnavailable, "backend is not configured")
		return
	}
	mcpOnce.Do(func() {
		mcpHandler, mcpErr = newMCPHandler(cfg)
	})
	if mcpErr != nil {
		platform.WriteError(w, http.StatusServiceUnavailable, "MCP server is unavailable")
		return
	}
	mcpHandler.ServeHTTP(w, r)
}
