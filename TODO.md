# PolitiChat — Development Roadmap

Each phase must be completed and committed before starting the next. Do not proceed to the next phase if tests are failing or functionality is broken.

---

## Phase 1: Swap OpenAI embeddings for HuggingFace (local)

**Goal:** Remove OpenAI dependency for embeddings. Run embeddings locally via HuggingFace.

- [ ] Install `sentence-transformers` in `requirements.txt`
- [ ] Create `scripts/test_embeddings.py` — embed a sample sentence, print output shape, confirm it is `(384,)`
- [ ] Replace `text-embedding-3-small` in `scripts/ingest.py` with `sentence-transformers/all-MiniLM-L6-v2`
- [ ] Replace `text-embedding-3-small` in `backend/src/services/rag.js` with a call to a local Python embedding service or HTTP wrapper
- [ ] Update Supabase: drop and recreate `embedding` column as `vector(384)`
- [ ] Update `match_chunks` SQL function to use `vector(384)`
- [ ] Re-run ingestion and confirm chunk count matches previous run
- [ ] Run end-to-end query test via Apollo Sandbox
- [ ] Update `requirements.txt`
- [ ] Commit: `feat: swap OpenAI embeddings for HuggingFace all-MiniLM-L6-v2`

**Success criteria:** `python test_embeddings.py` prints shape `(384,)`. End-to-end query returns a grounded answer.

---

## Phase 2: Add spaCy NER to ingestion pipeline

**Goal:** Extract named entities during ingestion and surface them in the UI.

- [ ] Install `spacy` and `en_core_web_sm` in `requirements.txt`
- [ ] Create `scripts/test_ner.py` — run spaCy on a hardcoded paragraph, print extracted entities
- [ ] In `scripts/ingest.py`, after fetching and before chunking, run spaCy and extract PERSON, ORG, GPE, DATE entities
- [ ] Add `entities` JSONB column to the `chunks` table in Supabase
- [ ] Store extracted entities in the `entities` column during ingestion
- [ ] Update `backend/src/schema/typeDefs.js` — add `entities` field to `Answer` type
- [ ] Update `backend/src/resolvers/resolvers.js` — return entities alongside answer and citations
- [ ] Update `frontend/src/App.jsx` — render entity tags beneath each answer, styled distinctly from citations
- [ ] Commit: `feat: add spaCy NER entity extraction to ingestion and UI`

**Success criteria:** `python test_ner.py` prints extracted entities. Frontend renders entity tags below answers.

---

## Phase 3: Terraform infrastructure for SageMaker

**Goal:** Define all AWS infrastructure as code before writing any application code that touches AWS.

**Prerequisites:** AWS CLI installed and configured (`aws configure`). Terraform installed.

- [ ] Install AWS CLI from https://aws.amazon.com/cli/
- [ ] Install Terraform from https://developer.hashicorp.com/terraform/install
- [ ] Run `aws configure` with IAM credentials
- [ ] Create `terraform/` directory with the following files:
  - [ ] `main.tf` — AWS provider, region variable
  - [ ] `variables.tf` — `aws_region`, `project_name`, `sagemaker_instance_type`
  - [ ] `outputs.tf` — SageMaker endpoint name, IAM role ARN
  - [ ] `iam.tf` — IAM role `politichat-sagemaker-role` with SageMaker and S3 policies
  - [ ] `sagemaker.tf` — SageMaker model, endpoint config, endpoint using `ml.t2.medium`
  - [ ] `terraform/README.md` — prerequisites, init/plan/apply/destroy instructions, cost warning
- [ ] Add `terraform.tfstate` and `terraform.tfvars` to `.gitignore`
- [ ] Run `terraform init` and `terraform validate` — no errors
- [ ] Run `terraform plan` — review output, do not apply yet
- [ ] Commit: `feat: add Terraform IaC for SageMaker endpoint`

**Success criteria:** `terraform validate` and `terraform plan` succeed with no errors. No AWS resources created yet.

**Cost warning:** Do not run `terraform apply` until ready to use the endpoint. SageMaker endpoints incur hourly charges. Run `terraform destroy` immediately after testing to avoid ongoing costs.

---

## Phase 4: Wire SageMaker endpoint into ingestion pipeline

**Goal:** Route embedding generation through the deployed SageMaker endpoint via a feature flag.

**Prerequisites:** Phase 3 complete and `terraform apply` has been run.

- [ ] Run `terraform apply` and retrieve endpoint name from outputs
- [ ] Create `sagemaker/inference.py` — handler accepting JSON lines input, returning embedding vectors
- [ ] Install `boto3` in `requirements.txt`
- [ ] Create `scripts/test_sagemaker.py` — send a single test sentence to the endpoint, print returned vector shape
- [ ] In `scripts/ingest.py`, add `--use-sagemaker` CLI flag
  - [ ] When flag is passed: route embedding through SageMaker via `boto3.invoke_endpoint`
  - [ ] When flag is not passed: fall back to local HuggingFace inference from Phase 1
  - [ ] Add error handling and logging for SageMaker invocation failures
- [ ] Update root `README.md` — updated architecture diagram, tech stack, both ingestion modes documented
- [ ] Run `terraform destroy` after testing to avoid ongoing charges
- [ ] Commit: `feat: add SageMaker embedding endpoint with --use-sagemaker flag`

**Success criteria:** `python test_sagemaker.py` prints vector shape `(384,)`. `python ingest.py --use-sagemaker` completes successfully. `python ingest.py` (no flag) still works via local inference.

---

## Backlog (post Phase 4)

- [ ] Streaming LLM responses via GraphQL subscriptions
- [ ] More data sources beyond Wikipedia (speeches, voting records, policy docs)
- [ ] 2D ideological vector map using PCA on politician embeddings
- [ ] CI/CD via GitHub Actions — test, build, deploy on push to main
- [ ] Docker + Kubernetes deployment on AWS EKS
- [ ] Rate limiting on GraphQL endpoint before any public deployment
- [ ] Authentication layer
- [ ] Migrate Terraform state to S3 backend with DynamoDB locking
