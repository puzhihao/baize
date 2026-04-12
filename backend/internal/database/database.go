package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/baize/backend/internal/config"
	"github.com/baize/backend/internal/model"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	cfg := config.App
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)

	gormLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             500 * time.Millisecond,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	DB = db
	log.Println("Database connected successfully")
}

func Migrate() {
	// Convert existing tables to utf8mb4 if they were created with a different charset.
	for _, table := range []string{"users", "resumes", "analyses", "resume_versions", "subscriptions"} {
		if DB.Migrator().HasTable(table) {
			DB.Exec("ALTER TABLE `" + table + "` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
		}
	}

	if err := DB.Set("gorm:table_options", "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci").AutoMigrate(
		&model.User{},
		&model.Resume{},
		&model.Analysis{},
		&model.ResumeVersion{},
		&model.Subscription{},
		&model.SystemPrompt{},
		&model.VerificationCode{},
		&model.Order{},
	); err != nil {
		log.Fatalf("Database migration failed: %v", err)
	}

	// Backfill existing users that have no username, then ensure unique index exists.
	DB.Exec("UPDATE users SET username = CONCAT('user_', id) WHERE username = '' OR username IS NULL")
	DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)`)

	log.Println("Database migration completed")
}
