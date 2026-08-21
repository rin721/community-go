// Package migration 绑定 Navigation 独占的三驱动 versioned SQL。
package migration

import (
	"embed"

	"github.com/rin721/go-scaffold-template/pkg/database"
	dbmigrate "github.com/rin721/go-scaffold-template/pkg/database/migrate"
)

const CurrentVersion uint = 1
const TableName = "navigation_schema_migrations"

//go:embed sqlite/*.sql postgres/*.sql mysql/*.sql
var sqlFiles embed.FS

func Set() dbmigrate.Set {
	return dbmigrate.Set{Name: "navigation", FS: sqlFiles, CurrentVersion: CurrentVersion, MigrationsTable: TableName, DriverPaths: map[database.Driver]string{database.DriverSQLite: "sqlite", database.DriverPostgres: "postgres", database.DriverMySQL: "mysql"}, SHA256ByFile: map[string]string{
		"sqlite/000001_create_navigation.up.sql": "58c28df3706d405b1633fdd87a8f3c21fbafe254e6993edae2507b5c160a8300", "sqlite/000001_create_navigation.down.sql": "4269c6352cf189515bfce8edb4675b0d2f0a170c6c3003d07456d82b59d69518",
		"postgres/000001_create_navigation.up.sql": "560e4b048a384a50a3ed1d6639b802be0a425b5ef1b5a1fbc5515539aa5c6c45", "postgres/000001_create_navigation.down.sql": "4269c6352cf189515bfce8edb4675b0d2f0a170c6c3003d07456d82b59d69518",
		"mysql/000001_create_navigation.up.sql": "469752bb8b519301967d33c7527d3ae0eeca838241832dafaccea9d59ed3a43b", "mysql/000001_create_navigation.down.sql": "4269c6352cf189515bfce8edb4675b0d2f0a170c6c3003d07456d82b59d69518",
	}}
}
