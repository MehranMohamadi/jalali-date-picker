package finance

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

const MaxSafeAmount int64 = 9007199254740991

type CategoryChange struct {
	Key   string  `json:"key"`
	Label *string `json:"label,omitempty"`
	Icon  *string `json:"icon,omitempty"`
	Color *string `json:"color,omitempty"`
}

type TransactionChange struct {
	ID            int64     `json:"id"`
	Type          *string   `json:"type,omitempty"`
	Title         *string   `json:"title,omitempty"`
	Amount        *int64    `json:"amount,omitempty"`
	Date          *string   `json:"date,omitempty"`
	Category      *string   `json:"category,omitempty"`
	Categories    *[]string `json:"categories,omitempty"`
	Tags          *[]string `json:"tags,omitempty"`
	Description   *string   `json:"description,omitempty"`
	PaymentMethod *string   `json:"paymentMethod,omitempty"`
	IsEssential   *bool     `json:"isEssential,omitempty"`
	IsLoan        *bool     `json:"isLoan,omitempty"`
	LoanPerson    *string   `json:"loanPerson,omitempty"`
}

type rawRecord = map[string]json.RawMessage

func field[T any](record rawRecord, key string) T {
	var value T
	_ = json.Unmarshal(record[key], &value)
	return value
}

func put(record rawRecord, key string, value any) {
	record[key], _ = json.Marshal(value)
}

func collection(root rawRecord, key string) ([]rawRecord, error) {
	records := []rawRecord{}
	if len(root[key]) == 0 {
		return records, nil
	}
	if err := json.Unmarshal(root[key], &records); err != nil {
		return nil, fmt.Errorf("invalid %s collection", key)
	}
	for _, record := range records {
		if record == nil {
			return nil, fmt.Errorf("invalid %s record", key)
		}
	}
	return records, nil
}

// Modify only selected fields. Untouched and future fields remain raw JSON,
// including fields absent from the read-only finance models.
func MutateSnapshot(data json.RawMessage, kind string, budgets []Budget, categories []CategoryChange, transactions []TransactionChange) (json.RawMessage, error) {
	if _, err := DecodeSnapshot(data); err != nil {
		return nil, err
	}
	var root rawRecord
	if err := json.Unmarshal(data, &root); err != nil {
		return nil, err
	}
	cats, err := collection(root, "categories")
	if err != nil {
		return nil, err
	}
	categoryKeys := map[string]bool{}
	for _, cat := range cats {
		categoryKeys[field[string](cat, "key")] = true
	}
	count := 0
	switch kind {
	case "budgets_update":
		count = len(budgets)
		items, err := collection(root, "budgets")
		if err != nil {
			return nil, err
		}
		seen := map[string]bool{}
		for _, change := range budgets {
			if !categoryKeys[change.Category] || seen[change.Category] || change.Budget < 0 || change.Budget > MaxSafeAmount {
				return nil, errors.New("unknown/duplicate category or invalid budget")
			}
			seen[change.Category] = true
			index := -1
			for i, item := range items {
				if field[string](item, "category") == change.Category {
					if index >= 0 {
						return nil, errors.New("duplicate stored budget")
					}
					index = i
				}
			}
			if index < 0 {
				items = append(items, rawRecord{})
				index = len(items) - 1
			}
			put(items[index], "category", change.Category)
			put(items[index], "budget", change.Budget)
		}
		put(root, "budgets", items)
	case "categories_create", "categories_update":
		count = len(categories)
		seen := map[string]bool{}
		for _, change := range categories {
			if !regexp.MustCompile(`^[a-zA-Z0-9_-]{1,80}$`).MatchString(change.Key) || seen[change.Key] {
				return nil, errors.New("invalid or duplicate category key")
			}
			seen[change.Key] = true
			index := -1
			for i, cat := range cats {
				if field[string](cat, "key") == change.Key {
					if index >= 0 {
						return nil, errors.New("duplicate stored category")
					}
					index = i
				}
			}
			if kind == "categories_create" {
				if index >= 0 || change.Label == nil {
					return nil, errors.New("category already exists or label is missing")
				}
				cats = append(cats, rawRecord{})
				index = len(cats) - 1
				put(cats[index], "key", change.Key)
				put(cats[index], "icon", "folder")
				put(cats[index], "color", "#64748b")
			} else if index < 0 {
				return nil, errors.New("category not found")
			}
			if change.Label == nil && change.Icon == nil && change.Color == nil {
				return nil, errors.New("empty category change")
			}
			if change.Label != nil {
				label := strings.TrimSpace(*change.Label)
				if label == "" || len([]rune(label)) > 80 {
					return nil, errors.New("invalid category label")
				}
				put(cats[index], "label", label)
			}
			if change.Icon != nil {
				if !regexp.MustCompile(`^[a-zA-Z0-9_-]{1,64}$`).MatchString(*change.Icon) {
					return nil, errors.New("invalid category icon")
				}
				put(cats[index], "icon", *change.Icon)
			}
			if change.Color != nil {
				if !regexp.MustCompile(`^#[a-fA-F0-9]{6}$`).MatchString(*change.Color) {
					return nil, errors.New("color must be #RRGGBB")
				}
				put(cats[index], "color", *change.Color)
			}
		}
		labels := map[string]bool{}
		for _, cat := range cats {
			label := strings.ToLower(strings.TrimSpace(field[string](cat, "label")))
			if labels[label] {
				return nil, errors.New("duplicate category label")
			}
			labels[label] = true
		}
		put(root, "categories", cats)
	case "transactions_update":
		count = len(transactions)
		items, err := collection(root, "transactions")
		if err != nil {
			return nil, err
		}
		seen := map[int64]bool{}
		tags, err := collection(root, "tags")
		if err != nil {
			return nil, err
		}
		tagKeys := map[string]bool{}
		for _, tag := range tags {
			tagKeys[field[string](tag, "key")] = true
		}
		for _, change := range transactions {
			if change.ID <= 0 || change.ID > MaxSafeAmount || seen[change.ID] {
				return nil, errors.New("invalid or duplicate transaction ID")
			}
			seen[change.ID] = true
			index := -1
			for i, item := range items {
				if field[int64](item, "id") == change.ID {
					if index >= 0 {
						return nil, errors.New("duplicate stored transaction ID")
					}
					index = i
				}
			}
			if index < 0 {
				return nil, fmt.Errorf("transaction %d not found", change.ID)
			}
			encoded, _ := json.Marshal(change)
			var patch rawRecord
			_ = json.Unmarshal(encoded, &patch)
			delete(patch, "id")
			if len(patch) == 0 {
				return nil, errors.New("empty transaction change")
			}
			item := items[index]
			source := field[string](item, "sourceType")
			if source == "credit-payment" {
				for _, key := range []string{"type", "amount", "date", "paymentMethod"} {
					if _, exists := patch[key]; exists {
						return nil, errors.New("edit credit settlement amounts, type, dates and payment method in Budgetyar to preserve ledger rules")
					}
				}
			}
			if source == "installment" {
				if _, exists := patch["type"]; exists {
					return nil, errors.New("change installment payment type in Budgetyar to update the installment ledger")
				}
				if _, exists := patch["date"]; exists {
					return nil, errors.New("change installment payment date in Budgetyar to validate the payment date")
				}
			}
			for key, value := range patch {
				item[key] = value
			}
			typ := field[string](item, "type")
			amount := field[int64](item, "amount")
			if typ != "income" && typ != "expense" || amount <= 0 || amount > MaxSafeAmount || strings.TrimSpace(field[string](item, "title")) == "" || len([]rune(field[string](item, "title"))) > 200 || !ValidJalaliDate(field[string](item, "date")) {
				return nil, errors.New("invalid transaction type, amount, title or Jalali date")
			}
			if len([]rune(field[string](item, "description"))) > 4000 || len([]rune(field[string](item, "loanPerson"))) > 200 {
				return nil, errors.New("transaction text too long")
			}
			if typ == "expense" && field[bool](item, "isLoan") && strings.TrimSpace(field[string](item, "loanPerson")) == "" {
				return nil, errors.New("loanPerson is required for a loan expense")
			}
			if method := field[string](item, "paymentMethod"); method != "" && method != "cash" && method != "credit" {
				return nil, errors.New("invalid payment method")
			}
			if change.Tags != nil {
				for _, key := range *change.Tags {
					if !tagKeys[key] {
						return nil, errors.New("unknown tag")
					}
				}
			}
			if typ == "income" {
				delete(item, "category")
				delete(item, "categories")
				delete(item, "tags")
			} else if change.Category != nil || change.Categories != nil || change.Type != nil {
				primary := field[string](item, "category")
				keys := field[[]string](item, "categories")
				if change.Category != nil && change.Categories == nil {
					keys = []string{primary}
				}
				if change.Categories != nil && change.Category == nil && len(keys) > 0 {
					primary = keys[0]
				}
				if !categoryKeys[primary] {
					return nil, errors.New("expense requires an existing primary category")
				}
				unique := []string{primary}
				used := map[string]bool{primary: true}
				for _, key := range keys {
					if !categoryKeys[key] {
						return nil, errors.New("unknown transaction category")
					}
					if !used[key] {
						unique = append(unique, key)
						used[key] = true
					}
				}
				put(item, "category", primary)
				put(item, "categories", unique)
			}
		}
		put(root, "transactions", items)
	default:
		return nil, errors.New("unsupported mutation")
	}
	if count < 1 || count > 100 {
		return nil, errors.New("provide between 1 and 100 changes")
	}
	// The app derives these values. Remove the cached summary rather than expose stale totals.
	// Older snapshots may keep creditLimit only in summary; promote it before dropping the cache.
	if _, exists := root["creditLimit"]; !exists {
		var summary rawRecord
		if json.Unmarshal(root["summary"], &summary) == nil {
			if value, exists := summary["creditLimit"]; exists {
				root["creditLimit"] = value
			}
		}
	}
	delete(root, "summary")
	delete(root, "exportedAt")
	result, err := json.Marshal(root)
	if len(result) > 2<<20 {
		return nil, errors.New("snapshot exceeds 2 MiB")
	}
	return result, err
}

// Same break-year leap algorithm used by src/utils/jalali.ts.
func ValidJalaliDate(value string) bool {
	if !regexp.MustCompile(`^[0-9]{4}/[0-9]{2}/[0-9]{2}$`).MatchString(value) {
		return false
	}
	year, _ := strconv.Atoi(value[:4])
	month, _ := strconv.Atoi(value[5:7])
	day, _ := strconv.Atoi(value[8:])
	if year < 1 || year >= 3178 || month < 1 || month > 12 || day < 1 {
		return false
	}
	maxDay := 30
	if month <= 6 {
		maxDay = 31
	} else if month == 12 {
		breaks := []int{-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178}
		previous, jump := breaks[0], 0
		for _, next := range breaks[1:] {
			jump = next - previous
			if year < next {
				break
			}
			previous = next
		}
		n := year - previous
		if jump-n < 6 {
			n = n - jump + (jump+4)/33*33
		}
		leap := ((n+1)%33 - 1) % 4
		maxDay = 29
		if leap == 0 {
			maxDay = 30
		}
	}
	return day <= maxDay
}
