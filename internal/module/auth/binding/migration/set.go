// Package migration 绑定 Auth 独占的低敏审计事件表版本化 SQL。
package migration

import (
	"embed"

	"github.com/rin721/go-scaffold-template/pkg/database"
	dbmigrate "github.com/rin721/go-scaffold-template/pkg/database/migrate"
)

const CurrentVersion uint = 1
const TableName = "auth_schema_migrations"

//go:embed sqlite/*.sql postgres/*.sql mysql/*.sql
var sqlFiles embed.FS

func Set() dbmigrate.Set {
	return dbmigrate.Set{
		Name: "auth", FS: sqlFiles, CurrentVersion: CurrentVersion, MigrationsTable: TableName,
		DriverPaths: map[database.Driver]string{database.DriverSQLite: "sqlite", database.DriverPostgres: "postgres", database.DriverMySQL: "mysql"},
		SHA256ByFile: map[string]string{
			"sqlite/000001_create_auth_audit_events.up.sql":   "3632fec8638c63c26006547cc59b43b523c6a49a457f2b65f2ed0cbfa89cef30",
			"sqlite/000001_create_auth_audit_events.down.sql": "20d231aa4d1f563a9f8b2a813619f599b7511a0cab6859dd64f961c5fe8a03d8",
			"postgres/000001_create_auth_audit_events.up.sql":   "83b592ac678cb8edcfc6325b3fdde6a694b1e0ac884ca34db5a52762727bd262",
			"postgres/000001_create_auth_audit_events.down.sql": "20d231aa4d1f563a9f8b2a813619f599b7511a0cab6859dd64f961c5fe8a03d8",
			"mysql/000001_create_auth_audit_events.up.sql":   "b3daa7245a9b4a2a32ef3fb2379a60e96d58cfa2365d09d7c819da986764e0a9",
			"mysql/000001_create_auth_audit_events.down.sql": "20d231aa4d1f563a9f8b2a813619f599b7511a0cab6859dd64f961c5fe8a03d8",
		},
	}
}