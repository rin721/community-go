package db

import (
	"fmt"

	"github.com/open-console/console-platform/pkg/database"
)

func closeDatabaseResource(db database.Database) error {
	if db == nil {
		return nil
	}
	if err := db.Close(); err != nil {
		return fmt.Errorf("database close: %w", err)
	}
	return nil
}
