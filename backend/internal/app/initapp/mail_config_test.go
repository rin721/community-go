package initapp

import (
	"testing"

	appconfig "github.com/open-console/console-platform/internal/config"
	systemmodel "github.com/open-console/console-platform/internal/modules/system/model"
)

func TestMailConfigMapsSMTPFields(t *testing.T) {
	cfg := MailConfig(appconfig.SMTPConfig{
		Host:     "smtp.example.com",
		Port:     587,
		Username: "user",
		Password: "pass",
		From:     "noreply@example.com",
		FromName: "Console Platform",
		Security: appconfig.SMTPSecurityStartTLS,
	})
	if cfg.Host != "smtp.example.com" || cfg.Port != 587 || cfg.Username != "user" || cfg.Password != "pass" || cfg.From != "noreply@example.com" || cfg.FromName != "Console Platform" || cfg.Security != "starttls" {
		t.Fatalf("unexpected mail config: %#v", cfg)
	}
}

func TestSystemConfigSnapshotIncludesCompleteSMTPFields(t *testing.T) {
	snapshot := SystemConfigSnapshot(&appconfig.Config{
		Auth: appconfig.AuthConfig{
			SMTP: appconfig.SMTPConfig{
				Host:     "smtp.example.com",
				Port:     587,
				Username: "user",
				Password: "pass",
				From:     "noreply@example.com",
				FromName: "Console Platform",
				Security: appconfig.SMTPSecurityStartTLS,
			},
		},
	})
	items := map[string]any{}
	for _, section := range snapshot.Sections {
		for _, item := range section.Items {
			items[item.Key] = item.Value
		}
	}
	if items["auth.smtp.from_name"] != "Console Platform" {
		t.Fatalf("snapshot from_name = %#v", items["auth.smtp.from_name"])
	}
	if items["auth.smtp.security"] != appconfig.SMTPSecurityStartTLS {
		t.Fatalf("snapshot security = %#v", items["auth.smtp.security"])
	}
}

func TestSystemConfigSnapshotIncludesBrandFields(t *testing.T) {
	snapshot := SystemConfigSnapshot(&appconfig.Config{
		Brand: appconfig.BrandConfig{
			ProductName: "Console Platform",
			ProductCode: "console-platform",
			VersionName: "Community",
		},
	})

	requireGroup(t, snapshot, "brand", "general", "")
	productName := findGroupItem(t, snapshot, "brand", "general", "brand.productName")
	productCode := findGroupItem(t, snapshot, "brand", "general", "brand.productCode")
	versionName := findGroupItem(t, snapshot, "brand", "general", "brand.versionName")

	if productName.Value != "Console Platform" || productCode.Value != "console-platform" || versionName.Value != "Community" {
		t.Fatalf("unexpected brand snapshot values: productName=%#v productCode=%#v versionName=%#v", productName.Value, productCode.Value, versionName.Value)
	}
	if productName.LabelKey != "system.config.items.brand.productName.label" {
		t.Fatalf("productName label key = %q", productName.LabelKey)
	}
}

func TestSystemConfigSnapshotGroupsSchemeFields(t *testing.T) {
	snapshot := SystemConfigSnapshot(&appconfig.Config{
		Database: appconfig.DatabaseConfig{Driver: appconfig.DatabaseDriverSQLite},
		Cache:    appconfig.CacheConfig{Driver: appconfig.CacheDriverHybrid},
		Storage:  appconfig.StorageConfig{Driver: appconfig.StorageDriverLocalMinIO},
		Auth: appconfig.AuthConfig{
			NotificationDriver: "smtp",
			SMTP:               appconfig.SMTPConfig{Security: appconfig.SMTPSecurityTLS},
		},
	})

	requireGroup(t, snapshot, "database", "driver", "")
	requireGroup(t, snapshot, "database", "sqlite", "database.driver")
	requireGroup(t, snapshot, "database", "mysql", "database.driver")
	requireGroup(t, snapshot, "cache", "local", "cache.driver")
	requireGroup(t, snapshot, "cache", "redis", "cache.driver")
	requireGroup(t, snapshot, "storage", "local", "storage.driver")
	requireGroup(t, snapshot, "storage", "minio", "storage.driver")
	requireGroup(t, snapshot, "auth", "smtp_security", "auth.notification_driver")

	storageDriver := findGroupItem(t, snapshot, "storage", "driver", "storage.driver")
	if storageDriver.Editor != "select" || len(storageDriver.Options) != 6 {
		t.Fatalf("storage.driver metadata = editor %q options %d", storageDriver.Editor, len(storageDriver.Options))
	}
}

func TestSystemConfigSnapshotIncludesMaintenanceCleanupFields(t *testing.T) {
	snapshot := SystemConfigSnapshot(&appconfig.Config{
		System: appconfig.SystemConfig{
			SeedDefaultsOnStart:               boolPtr(true),
			MaintenanceCleanupIntervalSeconds: intPtr(120),
			MaintenanceCleanupBatchSize:       intPtr(25),
		},
	})

	requireGroup(t, snapshot, "system", "defaults", "")
	requireGroup(t, snapshot, "system", "maintenance", "")
	interval := findGroupItem(t, snapshot, "system", "maintenance", "system.maintenance_cleanup_interval_seconds")
	batchSize := findGroupItem(t, snapshot, "system", "maintenance", "system.maintenance_cleanup_batch_size")

	if interval.Value != 120 || batchSize.Value != 25 {
		t.Fatalf("unexpected maintenance config values: interval=%#v batch=%#v", interval.Value, batchSize.Value)
	}
	if interval.LabelKey != "system.config.items.system.maintenance_cleanup_interval_seconds.label" {
		t.Fatalf("interval label key = %q", interval.LabelKey)
	}
}

func requireGroup(t *testing.T, snapshot systemmodel.ConfigSnapshot, sectionCode, groupKey, visibleField string) {
	t.Helper()
	for _, section := range snapshot.Sections {
		if section.Code != sectionCode {
			continue
		}
		for _, group := range section.Groups {
			if group.Key != groupKey {
				continue
			}
			if visibleField == "" {
				if group.VisibleWhen != nil {
					t.Fatalf("%s.%s visibleWhen = %#v, want nil", sectionCode, groupKey, group.VisibleWhen)
				}
			} else if group.VisibleWhen == nil || group.VisibleWhen.Field != visibleField {
				t.Fatalf("%s.%s visibleWhen = %#v, want field %s", sectionCode, groupKey, group.VisibleWhen, visibleField)
			}
			if len(group.Items) == 0 {
				t.Fatalf("%s.%s has no items", sectionCode, groupKey)
			}
			return
		}
		t.Fatalf("section %s missing group %s", sectionCode, groupKey)
	}
	t.Fatalf("missing section %s", sectionCode)
}

func findGroupItem(t *testing.T, snapshot systemmodel.ConfigSnapshot, sectionCode, groupKey, itemKey string) systemmodel.ConfigItem {
	t.Helper()
	for _, section := range snapshot.Sections {
		if section.Code != sectionCode {
			continue
		}
		for _, group := range section.Groups {
			if group.Key != groupKey {
				continue
			}
			for _, item := range group.Items {
				if item.Key == itemKey {
					return item
				}
			}
		}
	}
	t.Fatalf("missing item %s in %s.%s", itemKey, sectionCode, groupKey)
	return systemmodel.ConfigItem{}
}

func boolPtr(value bool) *bool {
	return &value
}
