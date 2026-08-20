package mail

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net"
	"net/smtp"
	"time"
)

// Sender 是邮件投递端口。
type Sender interface {
	Send(context.Context, Message) error
}

// Checker 是不投递邮件的 SMTP 可用性检查端口。
type Checker interface {
	Check(context.Context) error
}

// SMTPSender 使用 SMTP 协议发送邮件并检查连接。
type SMTPSender struct {
	cfg       Config
	tlsConfig *tls.Config
}

func NewSMTP(cfg Config) (*SMTPSender, error) {
	cfg.applyDefaults()
	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return &SMTPSender{cfg: cfg}, nil
}

func (s *SMTPSender) Send(ctx context.Context, msg Message) (err error) {
	if err := ctx.Err(); err != nil {
		return err
	}
	from, err := s.cfg.fromAddress()
	if err != nil {
		return err
	}
	data, recipients, err := buildMessage(from, msg)
	if err != nil {
		return err
	}
	client, err := s.connect(ctx)
	if err != nil {
		return err
	}
	closed := false
	defer func() {
		if !closed {
			err = errors.Join(err, closeSMTPClient(client))
		}
	}()
	if err := s.prepare(ctx, client); err != nil {
		return err
	}
	if err := client.Mail(from.Address); err != nil {
		return err
	}
	for _, recipient := range recipients {
		if err := client.Rcpt(recipient); err != nil {
			return err
		}
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(data); err != nil {
		return errors.Join(err, closeSMTPDataWriter(writer))
	}
	if err := writer.Close(); err != nil {
		return err
	}
	if err := client.Quit(); err != nil {
		closeErr := closeSMTPClient(client)
		closed = true
		return errors.Join(err, closeErr)
	}
	closed = true
	return nil
}

func (s *SMTPSender) Check(ctx context.Context) (err error) {
	if err := ctx.Err(); err != nil {
		return err
	}
	client, err := s.connect(ctx)
	if err != nil {
		return err
	}
	closed := false
	defer func() {
		if !closed {
			err = errors.Join(err, closeSMTPClient(client))
		}
	}()
	if err := s.prepare(ctx, client); err != nil {
		return err
	}
	if err := client.Noop(); err != nil {
		return fmt.Errorf("%w: %v", ErrNoop, err)
	}
	if err := client.Quit(); err != nil {
		closeErr := closeSMTPClient(client)
		closed = true
		return errors.Join(err, closeErr)
	}
	closed = true
	return nil
}

func (s *SMTPSender) connect(ctx context.Context) (*smtp.Client, error) {
	dialer := &net.Dialer{Timeout: s.cfg.DialTimeout}
	conn, err := dialer.DialContext(ctx, "tcp", s.cfg.address())
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrConnect, err)
	}
	if err := applySMTPDeadline(ctx, conn, s.cfg.DialTimeout); err != nil {
		return nil, errors.Join(err, closeSMTPConn(conn))
	}
	if s.cfg.Security == SecurityTLS {
		tlsConn := tls.Client(conn, s.effectiveTLSConfig())
		if err := tlsConn.HandshakeContext(ctx); err != nil {
			return nil, errors.Join(fmt.Errorf("%w: %v", ErrTLSHandshake, err), closeSMTPConn(conn))
		}
		conn = tlsConn
	}
	client, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		return nil, errors.Join(err, closeSMTPConn(conn))
	}
	return client, nil
}

func applySMTPDeadline(ctx context.Context, conn net.Conn, timeout time.Duration) error {
	if conn == nil {
		return nil
	}
	if deadline, ok := ctx.Deadline(); ok {
		if err := conn.SetDeadline(deadline); err != nil {
			return fmt.Errorf("smtp connection deadline: %w", err)
		}
		return nil
	}
	if timeout > 0 {
		if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
			return fmt.Errorf("smtp connection deadline: %w", err)
		}
	}
	return nil
}

func closeSMTPClient(client *smtp.Client) error {
	if client == nil {
		return nil
	}
	if err := client.Close(); err != nil {
		return fmt.Errorf("smtp client close: %w", err)
	}
	return nil
}

func closeSMTPConn(conn net.Conn) error {
	if conn == nil {
		return nil
	}
	if err := conn.Close(); err != nil {
		return fmt.Errorf("smtp connection close: %w", err)
	}
	return nil
}

func closeSMTPDataWriter(writer io.Closer) error {
	if writer == nil {
		return nil
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("smtp data writer close: %w", err)
	}
	return nil
}

func (s *SMTPSender) prepare(ctx context.Context, client *smtp.Client) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if err := client.Hello("localhost"); err != nil {
		return err
	}
	if s.cfg.Security == SecurityStartTLS {
		if err := client.StartTLS(s.effectiveTLSConfig()); err != nil {
			return fmt.Errorf("%w: %v", ErrStartTLS, err)
		}
	}
	if s.cfg.Username != "" {
		if err := client.Auth(smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)); err != nil {
			return fmt.Errorf("%w: %v", ErrAuth, err)
		}
	}
	return ctx.Err()
}

func (s *SMTPSender) effectiveTLSConfig() *tls.Config {
	tlsCfg := s.tlsConfig
	if tlsCfg == nil {
		return &tls.Config{ServerName: s.cfg.Host, MinVersion: tls.VersionTLS12}
	}
	tlsCfg = tlsCfg.Clone()
	if tlsCfg.ServerName == "" {
		tlsCfg.ServerName = s.cfg.Host
	}
	if tlsCfg.MinVersion == 0 {
		tlsCfg.MinVersion = tls.VersionTLS12
	}
	return tlsCfg
}
