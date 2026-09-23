package finance

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

type Transaction struct {
	ID            int64  `json:"id"`
	Type          string `json:"type"`
	Title         string `json:"title"`
	Amount        int64  `json:"amount"`
	Date          string `json:"date"`
	Category      string `json:"category,omitempty"`
	Description   string `json:"description,omitempty"`
	PaymentMethod string `json:"paymentMethod,omitempty"`
}

type Category struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}

type Budget struct {
	Category string `json:"category"`
	Budget   int64  `json:"budget"`
}

type Snapshot struct {
	App          string        `json:"app"`
	Version      int           `json:"version"`
	Transactions []Transaction `json:"transactions"`
	Categories   []Category    `json:"categories"`
	Budgets      []Budget      `json:"budgets"`
	CreditLimit  int64         `json:"creditLimit"`
}

func DecodeSnapshot(data json.RawMessage) (Snapshot, error) {
	var snapshot Snapshot
	if err := json.Unmarshal(data, &snapshot); err != nil {
		return Snapshot{}, err
	}
	if snapshot.App != "budgetyar" {
		return Snapshot{}, fmt.Errorf("invalid Budgetyar snapshot")
	}
	return snapshot, nil
}

type TransactionFilter struct {
	From  string
	To    string
	Type  string
	Limit int
}

type Summary struct {
	TotalIncome  int64 `json:"totalIncome"`
	TotalExpense int64 `json:"totalExpense"`
	Balance      int64 `json:"balance"`
	Count        int   `json:"transactionCount"`
}

func SummarizeTransactions(items []Transaction, from, to string) Summary {
	var summary Summary
	for _, item := range items {
		if from != "" && item.Date < from || to != "" && item.Date > to {
			continue
		}
		summary.Count++
		if item.Type == "income" {
			summary.TotalIncome += item.Amount
		} else if item.Type == "expense" {
			summary.TotalExpense += item.Amount
		}
	}
	summary.Balance = summary.TotalIncome - summary.TotalExpense
	return summary
}

func FilterTransactions(items []Transaction, filter TransactionFilter) []Transaction {
	result := make([]Transaction, 0, len(items))
	for _, item := range items {
		if filter.From != "" && strings.Compare(item.Date, filter.From) < 0 {
			continue
		}
		if filter.To != "" && strings.Compare(item.Date, filter.To) > 0 {
			continue
		}
		if filter.Type != "" && item.Type != filter.Type {
			continue
		}
		result = append(result, item)
	}
	sort.SliceStable(result, func(i, j int) bool {
		if result[i].Date == result[j].Date {
			return result[i].ID > result[j].ID
		}
		return result[i].Date > result[j].Date
	})
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if len(result) > limit {
		result = result[:limit]
	}
	return result
}
