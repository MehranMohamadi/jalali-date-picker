package finance

import "testing"

func TestFilterTransactions(t *testing.T) {
	items := []Transaction{
		{ID: 1, Type: "expense", Date: "1405/01/02", Amount: 100},
		{ID: 2, Type: "income", Date: "1405/01/03", Amount: 500},
		{ID: 3, Type: "expense", Date: "1405/01/04", Amount: 200},
	}
	got := FilterTransactions(items, TransactionFilter{From: "1405/01/03", Type: "expense", Limit: 10})
	if len(got) != 1 || got[0].ID != 3 {
		t.Fatalf("unexpected filtered transactions: %#v", got)
	}
}

func TestSummarizeTransactions(t *testing.T) {
	items := []Transaction{
		{Type: "income", Date: "1405/01/02", Amount: 1_000},
		{Type: "expense", Date: "1405/01/03", Amount: 300},
		{Type: "expense", Date: "1405/02/01", Amount: 200},
	}
	got := SummarizeTransactions(items, "1405/01/01", "1405/01/31")
	if got.TotalIncome != 1_000 || got.TotalExpense != 300 || got.Balance != 700 || got.Count != 2 {
		t.Fatalf("unexpected summary: %#v", got)
	}
}
