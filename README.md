# AI Insurance Adjuster

AI Insurance Adjuster is an AI-assisted auto-claims processing platform that intakes claim events, verifies evidence, assesses liability, and checks policy coverage while keeping a human override and audit trail. It targets the problem of manual claim handling being slow, inconsistent, and hard to scale by standardizing the decision flow and routing low-confidence cases to admins.

## Table of Contents

- Overview
- Architecture
- Diagrams
- Folder Structure
- Core Workflow
- Agents and Services
- Data and Storage
- API Endpoints
- Configuration and Environment
- Local Development
- Docker Compose and Production
- Testing
- Observability and Operations
- Security and Compliance
- Scaling and Performance
- Troubleshooting

## Overview

The AI Insurance Adjuster is a FastAPI-based application that accepts claim events, streams them through Redis, and processes them using specialized AI agents. Each agent performs a focused task (classification, damage detection, liability, RAG, etc.), and results are persisted through infrastructure adapters. Admins can accept or override decisions via API endpoints.

Key goals:

- Deterministic, observable event processing.
- Modular agent design and orchestration.
- Clear boundaries between domain logic and infrastructure adapters.
- Production-friendly deployment and scaling.

## Architecture

Think of the system as a fast front door, a reliable event bus, and a set of specialist workers that each do one job well. A claim enters once, then flows step-by-step through the pipeline until a final decision is produced.

### Who does what

- **API Gateway (FastAPI)**: The front door. Validates the request and turns it into a claim event.
- **Redis Streams**: The queue. Ensures claim events are processed in order and can be retried.
- **Workflow Orchestrator**: The traffic controller. Decides which agent runs next based on the claim state.
- **Agent Workers**: The specialists. Each agent performs a single task (classification, damage, liability, RAG, etc.) and emits its result.
- **Data Stores**: The memory. Supabase stores claim results and admin actions; the vector store holds policy embeddings; Redis keeps event state.
- **Realtime Notifications**: The messenger. Socket events notify admins and claimants of progress and outcomes.

### End-to-end claim flow

1. A claim is posted to `POST /publish_event`.
2. The API validates the token, wraps the request into a `ClaimEvent`, and writes it to `stream:events:new_claims`.
3. The orchestrator consumes the event and selects the next agent based on claim state.
4. The selected agent processes its task and emits a result event to `stream:events:claim_results`.
5. The orchestrator reads the result and either routes to the next agent or finalizes the claim.
6. Final results are persisted (Supabase) and pushed to clients through socket events.
7. If an agent fails or confidence is low, the system flags the claim for admin review.

### Admin decision path

- Liability review: `POST /resolve_liability` lets admins accept or override AI liability.
- Policy review: `POST /resolve_rag` lets admins approve or reject based on policy findings.
- Approved or rejected outcomes trigger claimant notifications and a final status update.

## Diagrams

System-level architecture:

This diagram shows the end-to-end system, including the API entrypoint, event bus, agent workers, and persistence layers. It is the top-level view of how requests move through the pipeline and where results are stored.

![Complete System](src/pics/Complete%20System%20Architecute.png)

Worker architecture:

This diagram focuses on the agent worker topology and how the workflow orchestrator routes tasks across agents. Use it to understand the worker boundaries and the main decision flow between steps.

![AI Agent Workers](src/pics/AI%20Agent%20Workers%20Archtecture.png)

Redis stream flow:

This diagram details the event-driven flow over Redis streams, including input event topics and how agent outputs are published to downstream streams.

![Redis Stream Architecture](src/pics/Redis%20Stream%20Architecture.png)

Agent details (each includes its diagram and purpose):

### Classification Agent

The `classification_agent` determines the claim category and initial routing decision. It inspects the incoming claim payload, normalizes key attributes, and sets the downstream workflow path so only the relevant agents run.

<img src="src/pics/Classification%20Agent.png" alt="Classification Agent" width="600" />

### Damage Detection Agent

The `damage_detection_agent` analyzes claim images for damage signals. It produces a structured damage assessment that is later used by liability, coverage checks, and the final summary.

<img src="src/pics/Damage%20Detection%20Agent.png" alt="Damage Detection Agent" width="600" />

### Liability Agent

The `liability_agent` evaluates fault and responsibility using the claim narrative, context, and any available supporting data. It returns a liability decision or marks the claim for admin review when confidence is low.

<img src="src/pics/Liability%20Agent.png" alt="Liability Agent" width="600" />

### RAG Agent

The `rag_agent` retrieves policy sections from the vector store and checks coverage rules. It produces a policy-based decision with rationale, including approvals or rejections tied to the retrieved policy context.

<img src="src/pics/Rag%20Agent.png" alt="RAG Agent" width="600" />

### Same Vehicle Agent

The `same_vehicle_agent` verifies that all submitted images are consistent and belong to the same vehicle. This reduces mismatched evidence and helps prevent multi-vehicle claim contamination.

<img src="src/pics/Same%20Vehicle%20Agent.png" alt="Same Vehicle Agent" width="600" />

### Vehicle Type Agent

The `vehicle_type_agent` identifies the vehicle class from the available data. This classification supports validation checks and ensures coverage rules are applied to the correct vehicle type.

<img src="src/pics/Vehicle%20Type%20Agent.png" alt="Vehicle Type Agent" width="600" />

### Pipeline Summary Agent

The `image_pipeline_summary_agent` aggregates outputs from all agents and produces a final pipeline summary. This summary is the consolidated explanation of the automated decision and the supporting evidence.

<img src="src/pics/Pipeline%20Summary%20Agent.png" alt="Pipeline Summary Agent" width="600" />

## Folder Structure

Repository layout (trimmed):

```
.
├─ src/
│  ├─ __init__.py
│  ├─ config.py
│  ├─ docker-compose.yml
│  ├─ main.py
│  ├─ requirements.txt
│  ├─ application/
│  │  ├─ states.py
│  │  ├─ workflow.py
│  │  ├─ agents/
│  │  │  ├─ classification_agent.py
│  │  │  ├─ damage_detection_agent.py
│  │  │  ├─ image_pipeline_summary_agent.py
│  │  │  ├─ liability_agent.py
│  │  │  ├─ rag_agent.py
│  │  │  ├─ same_vehicle_agent.py
│  │  │  └─ vehicle_type_agent.py
│  │  └─ services/
│  │     ├─ classification_service.py
│  │     ├─ damage_detection_service.py
│  │     ├─ image_pipeline_summary_service.py
│  │     ├─ ingestion.py
│  │     ├─ liability_service.py
│  │     ├─ rag_service.py
│  │     ├─ same_vehicle_service.py
│  │     └─ vehicle_type_service.py
│  ├─ data/
│  │  └─ policies/
│  │     └─ chroma.sqlite3
│  ├─ domain/
│  │  ├─ entities.py
│  │  ├─ intent.py
│  │  ├─ ports.py
│  │  ├─ prompts/
│  │  └─ tools/
│  ├─ infrastructure/
│  │  ├─ adapters/
│  │  ├─ llm_providers/
│  │  ├─ redis/
│  │  ├─ socket/
│  │  ├─ supabase/
│  │  └─ vector_store/
│  └─ pics/
├─ tests/
│  ├─ backend/
│  └─ e2e/
└─ .git/
```

## Core Workflow

1. New claim arrives via `/publish_event`.
2. API validates the user and publishes a `ClaimEvent` to `stream:events:new_claims`.
3. Workflow orchestrator consumes the claim event and routes it to the right agent(s).
4. Agents run in background threads and write intermediate outputs to the results stream.
5. Admins can accept or override decisions via `/resolve_liability` and `/resolve_rag`.
6. Notifications are emitted over socket events for claim progress and outcomes.

## Agents and Services

Each agent is paired with a service layer that contains core decision logic and integration code.

- Classification: determines claim type and routing.
- Damage Detection: image analysis for vehicle damage.
- Liability Assessment: determines fault and validates claim rejection criteria.
- RAG Agent: checks policy coverage using retrieved policy contexts.
- Same Vehicle Agent: verifies that all images relate to the same vehicle.
- Vehicle Type Agent: identifies vehicle type for validation and coverage matching.
- Pipeline Summary Agent: compiles a final pipeline summary.

## Data and Storage

- Redis Streams: event bus for claims and results.
- Redis Document Store: policy metadata and versioning for RAG.
- Vector Store: policy embeddings for retrieval (Chroma adapter is available).
- Supabase: claim data, admin actions, and audit trail storage.

## API Endpoints

Primary endpoints defined in [src/main.py](src/main.py):

- POST `/publish_event` - publish a new claim event.
- POST `/resume_workflow` - resume a workflow after a failure.
- POST `/resolve_liability` - admin accept or override AI liability.
- POST `/upload_policy` - upload or update the policy document.
- POST `/resolve_rag` - admin decision on RAG outcome.
- GET `/policy_status` - policy version metadata.
- GET `/policy/coverages` - extract policy coverages from docx.

Internal endpoints:

- POST `/api/internal/emit-progress` - broadcast claim progress.
- POST `/api/internal/emit-agent-failure` - alert admin of agent failure.
- POST `/api/internal/emit-claim-status` - notify claimant of approval or rejection.

## Configuration and Environment

Configuration currently loads values from `.env.local` in [src/config.py](src/config.py).

Minimum environment variables observed in the code and compose file:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_PASSWORD`

Recommendation:

- Keep production secrets in a managed secret store.
- Use different service keys for read-only vs. service roles.
- Rotate credentials periodically and monitor access.

## Local Development

From repository root:

```bash
python -m venv .venv
source .venv/Scripts/activate  # Windows: .venv\Scripts\activate
pip install -r src/requirements.txt
```

Start the API locally:

```bash
cd src
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Note: this will also start all background workers via FastAPI lifespan.

## Docker Compose and Production

The compose file in [src/docker-compose.yml](src/docker-compose.yml) provisions Redis with persistence and password protection. Start Redis with:

```bash
cd src
docker compose up -d
```

Then run the application container or host process with the same environment variables used locally.

## Testing

Tests are in [tests](tests). Run:

```bash
pytest -q
```

Test suite categories:

- Backend tests for workflows, agents, and services.
- E2E tests for web flows

## Observability and Operations

- Structured JSON logging with request and claim correlation IDs.
- Distributed tracing for agent pipeline execution.
- Metrics for stream lag, worker throughput, and error rates.
- Alerting on agent failures, high latency, or policy ingestion errors.

## Security and Compliance

- Validate and sanitize inbound documents and images.
- Apply rate limits and strict auth for admin endpoints.
- Enforce least-privilege for all keys and service accounts.
- Implement PII redaction in logs and RAG results.

## Scaling and Performance

- Scale workers horizontally by stream consumer groups.
- Separate GPU workloads into dedicated worker pools.
- Cache policy contexts and image feature results where possible.
- Use autoscaling on queue depth and worker utilization.

## Troubleshooting

- If events are not processed, check Redis availability and stream lag.
- If policy ingestion fails, verify `.env.local` and document parsing dependencies.
- If socket events are not delivered, validate the socket server and network access.
