package orchestrator

import "github.com/open-console/console-platform/internal/modules/deploy/model"

type State = model.OrchestratorState

const (
	StateIdle       State = model.StateIdle
	StateSyncing    State = model.StateSyncing
	StateBuilding   State = model.StateBuilding
	StateLaunching  State = model.StateLaunching
	StateHandingOff State = model.StateHandingOff
	StateFailed     State = model.StateFailed
)
