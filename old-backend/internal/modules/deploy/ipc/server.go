package ipc

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"sync"
)

type Server struct {
	listener net.Listener
	incoming chan Message
	conn     net.Conn
	mu       sync.Mutex
	closed   chan struct{}
}

func NewServer() (*Server, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("ipc server listen: %w", err)
	}

	s := &Server{
		listener: l,
		incoming: make(chan Message, 10),
		closed:   make(chan struct{}),
	}

	go s.acceptLoop()

	return s, nil
}

func (s *Server) Addr() string {
	return s.listener.Addr().String()
}

func (s *Server) Send(msg Message) error {
	s.mu.Lock()
	conn := s.conn
	s.mu.Unlock()

	if conn == nil {
		return errors.New("no client connected")
	}

	raw, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}

	_, err = conn.Write(append(raw, '\n'))
	if err != nil {
		return fmt.Errorf("write message: %w", err)
	}

	return nil
}

func (s *Server) Messages() <-chan Message {
	return s.incoming
}

func (s *Server) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	select {
	case <-s.closed:
		return nil
	default:
		close(s.closed)
	}

	var errs []error
	if s.conn != nil {
		if err := s.conn.Close(); err != nil {
			errs = append(errs, err)
		}
	}
	if err := s.listener.Close(); err != nil {
		errs = append(errs, err)
	}

	if len(errs) > 0 {
		return errors.Join(errs...)
	}
	return nil
}

func (s *Server) acceptLoop() {
	for {
		conn, err := s.listener.Accept()
		if err != nil {
			select {
			case <-s.closed:
				return
			default:
				// Log or handle listen error
				return
			}
		}

		s.mu.Lock()
		if s.conn != nil {
			// Close old connection if a new one arrives
			_ = s.conn.Close()
		}
		s.conn = conn
		s.mu.Unlock()

		go s.readLoop(conn)
	}
}

func (s *Server) readLoop(conn net.Conn) {
	defer conn.Close()
	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		var msg Message
		if err := json.Unmarshal(scanner.Bytes(), &msg); err != nil {
			continue
		}
		select {
		case s.incoming <- msg:
		case <-s.closed:
			return
		}
	}
}
