package service

import (
	"crypto/tls"
	"fmt"
	"log"
	"strconv"

	"github.com/baize/backend/internal/config"
	"gopkg.in/gomail.v2"
)

func SendVerificationEmail(to, code string) error {
	cfg := config.App.EmailServer
	log.Printf("[Email] 准备发送验证码邮件 to=%s host=%s port=%s ssl=%v from=%s",
		to, cfg.SMTPHost, cfg.SMTPPort, cfg.UseTLS, cfg.SendEmail)

	port, err := strconv.Atoi(cfg.SMTPPort)
	if err != nil {
		log.Printf("[Email] smtp_port 解析失败，使用默认 465: %v", err)
		port = 465
	}

	m := gomail.NewMessage()
	m.SetHeader("From", m.FormatAddress(cfg.SendEmail, "Baize"))
	m.SetHeader("To", to)
	m.SetHeader("Subject", "Baize邮箱账号激活")
	m.SetBody("text/plain", fmt.Sprintf(
		"【Baize 简历大师】亲爱的用户，您的注册验证码为：%s，有效期为5分钟，如非本人操作请忽略。",
		code,
	))

	d := gomail.NewDialer(cfg.SMTPHost, port, cfg.SendEmail, cfg.AuthCode)
	d.SSL = cfg.UseTLS
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	log.Printf("[Email] 开始 DialAndSend to=%s", to)
	if err := d.DialAndSend(m); err != nil {
		log.Printf("[Email] DialAndSend 失败 to=%s: %v", to, err)
		return fmt.Errorf("发送验证码邮件失败: %w", err)
	}
	log.Printf("[Email] 发送成功 to=%s", to)
	return nil
}

func SendResetPasswordEmail(to, code string) error {
	cfg := config.App.EmailServer
	log.Printf("[Email] 准备发送重置密码邮件 to=%s", to)

	port, err := strconv.Atoi(cfg.SMTPPort)
	if err != nil {
		port = 465
	}

	m := gomail.NewMessage()
	m.SetHeader("From", m.FormatAddress(cfg.SendEmail, "Baize"))
	m.SetHeader("To", to)
	m.SetHeader("Subject", "Baize账密重置")
	m.SetBody("text/plain", fmt.Sprintf(
		"【Baize 简历大师】亲爱的用户，您正在重置账号密码，验证码为：%s，有效期为5分钟，如非本人操作请忽略。",
		code,
	))

	d := gomail.NewDialer(cfg.SMTPHost, port, cfg.SendEmail, cfg.AuthCode)
	d.SSL = cfg.UseTLS
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	if err := d.DialAndSend(m); err != nil {
		log.Printf("[Email] DialAndSend 失败 to=%s: %v", to, err)
		return fmt.Errorf("发送重置密码邮件失败: %w", err)
	}
	log.Printf("[Email] 发送成功 to=%s", to)
	return nil
}
