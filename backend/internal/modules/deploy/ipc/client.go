package ipc

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net"
	"time"
)

type Client struct {
	conn     net.Conn
	incoming chan Message
	closed   chan struct{}
}

func Dial(addr string) (*Client, error) {
	conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		return nil, fmt.Errorf("ipc client dial: %w", err)
	}

	c := &Client{
		conn:     conn,
		incoming: make(chan Message, 10),
		closed:   make(chan struct{}),
	}

	go c.readLoop()

	return c, nil
}

func (c *Client) Send(msg Message) error {
	raw, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}

	_, err = c.conn.Write(append(raw, '\n'))
	if err != nil {
		return fmt.Errorf("write message: %w", err)
	}

	return nil
}

func (c *Client) Messages() <-chan Message {
	return c.incoming
}

func (c *Client) Close() error {
	select {
	case <-c.closed:
		return nil
	default:
		close(c.closed)
	}
	return c.conn.Close()
}

func (c *Client) readLoop() {
	defer func() {
		c.Close()
		close(c.incoming)
	}()
	scanner := bufio.NewScanner(c.conn)
	for scanner.Scan() {
		var msg Message
		if err := json.Unmarshal(scanner.Bytes(), &msg); err != nil {
			continue
		}
		select {
		case c.incoming <- msg:
		case <-c.closed:
			return
		}
	}
}
