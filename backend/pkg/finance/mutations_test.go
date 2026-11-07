package finance

import (
	"encoding/json"
	"testing"
)

const testSnapshot = `{"app":"budgetyar","version":1,"transactions":[{"id":1,"type":"expense","title":"Lunch","amount":100,"date":"1405/01/01","category":"food","categories":["food","other"],"sourceType":"manual","future":{"n":1234567890123456789}}],"categories":[{"key":"food","label":"Food","icon":"folder","color":"#123456","future":true},{"key":"other","label":"Other"}],"budgets":[{"category":"food","budget":1000,"future":true}],"tags":[],"installments":[{"future":true}],"subscriptions":[{"id":"keep"}],"creditAdjustments":{"1405/01":20},"future":{"n":1234567890123456789},"summary":{"totalExpense":100}}`

func ptr[T any](v T) *T { return &v }
func TestMutationsPreserveData(t *testing.T) {
	result, err := MutateSnapshot(json.RawMessage(testSnapshot), "transactions_update", nil, nil, []TransactionChange{{ID: 1, Amount: ptr[int64](300), Category: ptr("other")}})
	if err != nil {
		t.Fatal(err)
	}
	var root rawRecord
	json.Unmarshal(result, &root)
	if string(root["future"]) != `{"n":1234567890123456789}` {
		t.Fatal("lost future number", string(result))
	}
	for _, key := range []string{"installments", "subscriptions", "creditAdjustments"} {
		var original rawRecord
		json.Unmarshal([]byte(testSnapshot), &original)
		if string(root[key]) != string(original[key]) {
			t.Fatal("lost field", key)
		}
	}
	if _, ok := root["summary"]; ok {
		t.Fatal("stale summary retained")
	}
	items, _ := collection(root, "transactions")
	if field[int64](items[0], "amount") != 300 || field[string](items[0], "sourceType") != "manual" || len(field[[]string](items[0], "categories")) != 1 || field[string](items[0], "category") != "other" {
		t.Fatal(string(result))
	}
	if string(items[0]["future"]) != `{"n":1234567890123456789}` {
		t.Fatal("lost transaction extension")
	}
}

func TestMutationValidationAndAtomicity(t *testing.T) {
	tests := []struct {
		name, kind string
		budgets    []Budget
		cats       []CategoryChange
		txns       []TransactionChange
	}{
		{name: "unknown transaction", kind: "transactions_update", txns: []TransactionChange{{ID: 2, Amount: ptr[int64](200)}}},
		{name: "invalid date", kind: "transactions_update", txns: []TransactionChange{{ID: 1, Date: ptr("1405/12/30")}}},
		{name: "negative amount", kind: "transactions_update", txns: []TransactionChange{{ID: 1, Amount: ptr[int64](-1)}}},
		{name: "unsafe amount", kind: "transactions_update", txns: []TransactionChange{{ID: 1, Amount: ptr[int64](MaxSafeAmount + 1)}}},
		{name: "unknown category", kind: "transactions_update", txns: []TransactionChange{{ID: 1, Category: ptr("missing")}}},
		{name: "unknown tag", kind: "transactions_update", txns: []TransactionChange{{ID: 1, Tags: ptr([]string{"missing"})}}},
		{name: "duplicate ID", kind: "transactions_update", txns: []TransactionChange{{ID: 1, Amount: ptr[int64](2)}, {ID: 1, Amount: ptr[int64](3)}}},
		{name: "empty patch", kind: "transactions_update", txns: []TransactionChange{{ID: 1}}},
		{name: "negative budget", kind: "budgets_update", budgets: []Budget{{Category: "food", Budget: -1}}},
		{name: "unknown budget category", kind: "budgets_update", budgets: []Budget{{Category: "missing", Budget: 1}}},
		{name: "duplicate budget", kind: "budgets_update", budgets: []Budget{{Category: "food", Budget: 1}, {Category: "food", Budget: 2}}},
		{name: "duplicate category", kind: "categories_create", cats: []CategoryChange{{Key: "food", Label: ptr("New")}}},
		{name: "duplicate label", kind: "categories_create", cats: []CategoryChange{{Key: "new", Label: ptr("Food")}}},
		{name: "unknown category update", kind: "categories_update", cats: []CategoryChange{{Key: "new", Label: ptr("New")}}},
		{name: "CSS injection", kind: "categories_update", cats: []CategoryChange{{Key: "food", Color: ptr("red;display:none")}}},
		{name: "empty batch", kind: "budgets_update"},
		{name: "partial batch", kind: "transactions_update", txns: []TransactionChange{{ID: 1, Amount: ptr[int64](2)}, {ID: 2, Amount: ptr[int64](3)}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := MutateSnapshot(json.RawMessage(testSnapshot), tt.kind, tt.budgets, tt.cats, tt.txns)
			if err == nil || result != nil {
				t.Fatalf("accepted invalid batch: %s", result)
			}
		})
	}
}

func TestCategoryAndBudgetChanges(t *testing.T) {
	data, err := MutateSnapshot(json.RawMessage(testSnapshot), "categories_create", nil, []CategoryChange{{Key: "travel", Label: ptr("Travel")}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	data, err = MutateSnapshot(data, "categories_update", nil, []CategoryChange{{Key: "food", Label: ptr("Meals")}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	data, err = MutateSnapshot(data, "budgets_update", []Budget{{Category: "food", Budget: 0}, {Category: "travel", Budget: 200}}, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	var root rawRecord
	json.Unmarshal(data, &root)
	cats, _ := collection(root, "categories")
	budgets, _ := collection(root, "budgets")
	if len(cats) != 3 || field[string](cats[0], "label") != "Meals" || !field[bool](cats[0], "future") || field[string](cats[2], "icon") != "folder" || len(budgets) != 2 || !field[bool](budgets[0], "future") {
		t.Fatal(string(data))
	}
}

func TestJalaliValidation(t *testing.T) {
	for value, want := range map[string]bool{"1399/12/30": true, "1400/12/30": false, "1403/12/30": true, "1404/12/30": false, "1405/06/31": true, "1405/07/31": false, "1405/00/01": false, "1405/01/00": false, "2026-01-01": false, "3178/01/01": false} {
		if ValidJalaliDate(value) != want {
			t.Errorf("%s: want %v", value, want)
		}
	}
}

func TestLegacyCreditLimitSurvivesCacheRemoval(t *testing.T) {
	var root rawRecord
	json.Unmarshal([]byte(testSnapshot), &root)
	put(root, "summary", map[string]any{"creditLimit": 4000})
	raw, _ := json.Marshal(root)
	result, err := MutateSnapshot(raw, "budgets_update", []Budget{{Category: "food", Budget: 200}}, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	json.Unmarshal(result, &root)
	if field[int64](root, "creditLimit") != 4000 {
		t.Fatal("legacy credit limit lost")
	}
}
