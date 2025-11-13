"""Generate LaTeX and PDF project reports for the ecommerce data pipeline."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import textwrap
from typing import Iterable, List, Sequence

LATEX_OUTPUT = Path("Project_Report_Datapipeline.tex")
PDF_OUTPUT = Path("Project_Report_Datapipeline.pdf")


@dataclass(slots=True)
class Paragraph:
    text: str


@dataclass(slots=True)
class BulletList:
    items: Sequence[str]
    ordered: bool = False


@dataclass(slots=True)
class TableBlock:
    headers: Sequence[str]
    rows: Sequence[Sequence[str]]
    caption: str | None = None


@dataclass(slots=True)
class Section:
    title: str
    level: str
    blocks: List[Block] = field(default_factory=list)
    numbered: bool = True


Block = Paragraph | BulletList | TableBlock | Section


def escape_latex(text: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    for key, value in replacements.items():
        text = text.replace(key, value)
    return text


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def textwrap_lines(text: str, width: int = 88) -> list[str]:
    wrapped: list[str] = []
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            wrapped.append("")
            continue
        wrapped.extend(textwrap.wrap(paragraph, width=width))
    return wrapped


def section_to_latex(section: Section, indent: str = "") -> str:
    command_map = {
        "chapter": "\\chapter",
        "section": "\\section",
        "subsection": "\\subsection",
        "subsubsection": "\\subsubsection",
        "appendix": "\\chapter",
    }
    command = command_map.get(section.level, "\\section")
    if section.level == "appendix":
        command = "\\chapter"
    star = "*" if not section.numbered else ""
    content: list[str] = []
    title = escape_latex(section.title)
    if star:
        content.append(f"{indent}{command}{star}{{{title}}}")
        content.append(f"{indent}\\addcontentsline{{toc}}{{chapter}}{{{title}}}")
    else:
        content.append(f"{indent}{command}{star}{{{title}}}")
    for block in section.blocks:
        content.append(block_to_latex(block, indent=indent))
    return "\n".join(part for part in content if part)


def block_to_latex(block: Block, indent: str = "") -> str:
    if isinstance(block, Paragraph):
        text = escape_latex(block.text)
        return f"{indent}{text}\n"
    if isinstance(block, BulletList):
        env = "enumerate" if block.ordered else "itemize"
        items = [f"{indent}  \\item {escape_latex(item)}" for item in block.items]
        return "\n".join([
            f"{indent}\\begin{{{env}}}",
            *items,
            f"{indent}\\end{{{env}}}",
            "",
        ])
    if isinstance(block, TableBlock):
        column_format = "|" + "|".join(["p{0.25\\textwidth}" for _ in block.headers]) + "|"
        header_row = " & ".join(escape_latex(h) for h in block.headers) + r" \\"
        body_rows = [" & ".join(escape_latex(cell) for cell in row) + r" \\" for row in block.rows]
        lines = [
            f"{indent}\\begin{{longtable}}{{{column_format}}}",
            f"{indent}\\hline",
            f"{indent}{header_row}",
            f"{indent}\\hline\\endhead",
            *[f"{indent}{row}" for row in body_rows],
            f"{indent}\\hline",
            f"{indent}\\end{{longtable}}",
        ]
        if block.caption:
            lines.insert(-1, f"{indent}\\captionof{{table}}{{{escape_latex(block.caption)}}}")
        return "\n".join(lines)
    if isinstance(block, Section):
        return section_to_latex(block, indent=indent)
    raise TypeError(f"Unsupported block type: {type(block)!r}")


class SimplePDF:
    def __init__(self, page_width: int = 612, page_height: int = 792, margin: int = 54, line_height: int = 14, font_size: int = 11) -> None:
        self.page_width = page_width
        self.page_height = page_height
        self.margin = margin
        self.line_height = line_height
        self.font_size = font_size
        self.lines_per_page = max(1, (page_height - 2 * margin) // line_height)
        self.pages: list[list[str]] = [[]]

    def _ensure_page(self) -> None:
        if not self.pages:
            self.pages.append([])

    def add_lines(self, lines: Iterable[str]) -> None:
        for line in lines:
            if line == "":
                self._add_line("")
            else:
                self._add_line(line)

    def _add_line(self, line: str) -> None:
        current = self.pages[-1]
        if len(current) >= self.lines_per_page:
            self.pages.append([])
            current = self.pages[-1]
        current.append(line)

    def write(self, path: Path) -> None:
        objects: list[bytes] = []
        xref_positions: list[int] = []
        buffer = bytearray()

        def add_object(obj_num: int, content: bytes) -> None:
            xref_positions.append(len(buffer))
            buffer.extend(f"{obj_num} 0 obj\n".encode("latin-1"))
            buffer.extend(content)
            if not content.endswith(b"\n"):
                buffer.extend(b"\n")
            buffer.extend(b"endobj\n")

        page_count = len(self.pages)
        font_obj_id = 3 + 2 * page_count

        # Page content streams
        content_ids: list[int] = []
        for idx, page_lines in enumerate(self.pages, start=1):
            content_obj_id = 3 + page_count + idx - 1
            content_ids.append(content_obj_id)
            stream_lines = ["BT", f"/F1 {self.font_size} Tf", f"1 0 0 1 {self.margin} {self.page_height - self.margin} Tm"]
            first_line = True
            for line in page_lines:
                safe_line = escape_pdf_text(line)
                if first_line:
                    stream_lines.append(f"({safe_line}) Tj")
                    first_line = False
                else:
                    stream_lines.append(f"0 -{self.line_height} Td")
                    stream_lines.append(f"({safe_line}) Tj")
            stream_lines.append("ET")
            stream_content = "\n".join(stream_lines).encode("latin-1", "ignore")
            stream = b"<< /Length %d >>\nstream\n" % len(stream_content) + stream_content + b"\nendstream\n"
            add_object(content_obj_id, stream)

        # Page objects
        page_ids: list[int] = []
        for idx, content_id in enumerate(content_ids, start=1):
            page_id = 3 + idx - 1
            page_ids.append(page_id)
            page_dict = (
                b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %d %d] "
                b"/Resources << /Font << /F1 %d 0 R >> >> /Contents %d 0 R >>\n"
                % (self.page_width, self.page_height, font_obj_id, content_id)
            )
            add_object(page_id, page_dict)

        # Pages container
        kids = " ".join(f"{pid} 0 R" for pid in page_ids)
        pages_dict = f"<< /Type /Pages /Kids [{kids}] /Count {page_count} >>\n".encode("latin-1")
        add_object(2, pages_dict)

        # Font object
        font_dict = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n"
        add_object(font_obj_id, font_dict)

        # Catalog
        catalog_dict = b"<< /Type /Catalog /Pages 2 0 R >>\n"
        add_object(1, catalog_dict)

        # Header
        header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
        final_buffer = bytearray(header)
        final_buffer.extend(buffer)

        # XRef table
        xref_start = len(final_buffer)
        final_buffer.extend(f"xref\n0 {len(xref_positions) + 1}\n".encode("latin-1"))
        final_buffer.extend(b"0000000000 65535 f \n")
        for position in xref_positions:
            final_buffer.extend(f"{position:010} 00000 n \n".encode("latin-1"))

        # Trailer
        trailer = (
            f"trailer\n<< /Size {len(xref_positions) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n"
            .encode("latin-1")
        )
        final_buffer.extend(trailer)
        path.write_bytes(final_buffer)


def block_to_plain_text(block: Block, depth: int = 0) -> list[str]:
    indent = "  " * depth
    if isinstance(block, Paragraph):
        return [f"{indent}{line}" if line else "" for line in textwrap_lines(block.text)]
    if isinstance(block, BulletList):
        bullet = "1." if block.ordered else "-"
        lines: list[str] = []
        for idx, item in enumerate(block.items, start=1):
            marker = f"{idx}." if block.ordered else bullet
            wrapped = textwrap_lines(item)
            if wrapped:
                lines.append(f"{indent}{marker} {wrapped[0]}")
                for cont_line in wrapped[1:]:
                    lines.append(f"{indent}   {cont_line}")
            else:
                lines.append(f"{indent}{marker}")
        return lines
    if isinstance(block, TableBlock):
        header = " | ".join(block.headers)
        separator = "-+-".join("-" * len(h) for h in block.headers)
        lines = [f"{indent}{header}", f"{indent}{separator}"]
        for row in block.rows:
            lines.append(f"{indent}{' | '.join(row)}")
        if block.caption:
            lines.append("")
            lines.append(f"{indent}[{block.caption}]")
        return lines
    if isinstance(block, Section):
        return section_to_plain_text(block, depth)
    raise TypeError(f"Unsupported block type: {type(block)!r}")


def section_to_plain_text(section: Section, depth: int = 0) -> list[str]:
    heading_prefix = {
        "chapter": "#",
        "section": "##",
        "subsection": "###",
        "subsubsection": "####",
        "appendix": "#",
    }.get(section.level, "##")
    lines = [f"{heading_prefix} {section.title}"]
    for block in section.blocks:
        lines.extend(block_to_plain_text(block, depth + 1))
        lines.append("")
    return lines


def build_report_structure() -> list[Section]:
    generated_on = datetime.utcnow().strftime("%d %B %Y")
    front_matter = Section(
        title="Executive Summary",
        level="chapter",
        numbered=False,
        blocks=[
            Paragraph(
                "This report documents the end-to-end ecommerce data pipeline and customer "
                "experience platform that the team implemented for analytics, automation, and "
                "continuous delivery. The initiative delivers a modular architecture spanning "
                "data ingestion, transformation, reporting, and customer-facing services that "
                "can be deployed on AWS today with a clear path to Azure tomorrow."
            ),
            Paragraph(
                "The solution unifies Apache Airflow, dbt, and a React customer portal on top of "
                "container-native infrastructure. Terraform, Jenkins, and a shared observability "
                "fabric allow each component to be managed through infrastructure-as-code and "
                "repeatable pipelines."
            ),
            BulletList(
                [
                    "Accelerate data availability for merchandising and marketing teams with near real-time KPIs.",
                    "Enable blue/green-style application releases through Jenkins-driven automation for QA and main branches.",
                    "Lay the groundwork for multi-cloud portability by modelling every environment through configurable variables.",
                ]
            ),
            Paragraph(
                "Document generation completed on " + generated_on + "."
            ),
        ],
    )

    introduction = Section(
        title="Introduction",
        level="chapter",
        blocks=[
            Paragraph(
                "Ecommerce organisations operate under constant pressure to interpret signals from "
                "web, mobile, fulfilment, and customer support channels. The project establishes a "
                "single governed data pipeline that hydrates the analytical data mart, while the "
                "customer application exposes curated experiences powered by the same data foundation."
            ),
            Section(
                title="Background and Motivation",
                level="section",
                blocks=[
                    Paragraph(
                        "The legacy environment relied on ad-hoc scripts, manual database exports, and "
                        "department-specific dashboards that were difficult to reconcile. Engineers "
                        "spent a significant portion of their week maintaining brittle ETL jobs."
                    ),
                    Paragraph(
                        "By introducing Apache Airflow orchestrations, dbt modelling, and a managed "
                        "artifact repository, the team centralises governance, testing, and delivery "
                        "mechanisms while reducing operational overhead."
                    ),
                ],
            ),
            Section(
                title="Objectives",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Consolidate source data streams from order intake, catalogue management, and customer feedback into a trusted warehouse.",
                            "Provide stakeholders with curated dimensional models and KPIs refreshed within five minutes of operational events.",
                            "Deliver a responsive customer experience application that surfaces personalised promotions and order insights.",
                            "Automate infrastructure provisioning, application deployment, and validation through infrastructure-as-code and CI/CD workflows.",
                        ]
                    ),
                ],
            ),
        ],
    )

    problem_statement = Section(
        title="Problem Definition and Scope",
        level="chapter",
        blocks=[
            Paragraph(
                "The project addresses data latency, inconsistent reporting, and limited deployment automation. It targets ecommerce order and "
                "catalogue data, marketing campaign performance, and customer service interactions."
            ),
            Section(
                title="Business Challenges",
                level="section",
                blocks=[
                    Paragraph(
                        "Merchandising teams could not react to trending products because analytics lagged by several hours. Customer service lacked "
                        "unified views of orders and returns, fragmenting the brand experience."
                    ),
                    BulletList(
                        [
                            "Manual SQL exports delayed revenue reporting by up to two business days.",
                            "Nightly cron jobs failed silently, creating blind spots in marketing attribution.",
                            "Deployment scripts required administrator access on individual servers, increasing risk and cycle time.",
                        ]
                    ),
                ],
            ),
            Section(
                title="Project Scope",
                level="section",
                blocks=[
                    Paragraph(
                        "In scope: near real-time ingestion, curated marts for sales and marketing analytics, a React customer portal, and the "
                        "automation toolchain spanning Terraform and Jenkins."
                    ),
                    Paragraph(
                        "Out of scope: re-platforming transaction processing systems, custom machine learning models, and full ERP modernisation."
                    ),
                ],
            ),
        ],
    )

    requirements = Section(
        title="Requirements Analysis",
        level="chapter",
        blocks=[
            Section(
                title="Functional Requirements",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Schedule ingestion of order, inventory, campaign, and customer support feeds with retry-aware workflows.",
                            "Transform raw events into conformed dimensional tables and aggregate marts accessible by BI tools.",
                            "Expose REST endpoints for customer order status, personalised recommendations, and marketing content.",
                            "Provide administrative dashboards summarising pipeline health and deployment status.",
                        ]
                    ),
                ],
            ),
            Section(
                title="Non-Functional Requirements",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Achieve 99.5% availability for customer-facing services with automated recovery strategies.",
                            "Deliver analytics datasets within a five-minute freshness window from event capture.",
                            "Support multi-cloud portability with abstracted configuration variables and stateless containers.",
                            "Maintain compliance with data privacy regulations by enforcing encryption in transit and at rest.",
                        ]
                    ),
                ],
            ),
            Section(
                title="Stakeholder Expectations",
                level="section",
                blocks=[
                    TableBlock(
                        headers=["Stakeholder", "Interests", "Success Indicators"],
                        rows=[
                            [
                                "Chief Digital Officer",
                                "Accelerated release cadence, resilient infrastructure",
                                "Deployment cycle time reduced by 60%",
                            ],
                            [
                                "Marketing Analytics",
                                "Trusted campaign attribution metrics",
                                "Dashboards refreshed within five minutes",
                            ],
                            [
                                "Customer Support",
                                "Unified order and return history",
                                "Faster case resolution and higher CSAT",
                            ],
                            [
                                "DevOps Team",
                                "Repeatable provisioning, observability",
                                "Infrastructure codified and tested in CI",
                            ],
                        ],
                        caption="Stakeholder goals and measurable outcomes",
                    ),
                ],
            ),
        ],
    )

    architecture = Section(
        title="Architecture Overview",
        level="chapter",
        blocks=[
            Paragraph(
                "The solution follows a modular layered architecture: data ingestion, orchestration, modelling, serving, and experience delivery. "
                "Infrastructure modules group networking, compute, storage, and security primitives."
            ),
            Section(
                title="High-Level Components",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Data Ingestion Layer: Kafka-compatible stream via AWS Kinesis Data Streams (extensible to Azure Event Hubs).",
                            "Processing Layer: Apache Airflow orchestrations executing Python operators and dbt models.",
                            "Storage Layer: Amazon S3 for raw and curated zones, Amazon RDS PostgreSQL warehouse (portable to Azure Blob and Azure Database for PostgreSQL).",
                            "Serving Layer: RESTful APIs and React frontend containerised for ECS Fargate with parallels in Azure Container Apps.",
                            "Observability Layer: Prometheus-compatible metrics and structured logging shipped to CloudWatch (or Azure Monitor).",
                        ]
                    ),
                ],
            ),
            Section(
                title="Data Flow",
                level="section",
                blocks=[
                    Paragraph(
                        "Synthetic orders emulate browse-to-purchase journeys and land in the ingestion bucket. Airflow DAGs apply validation, enrichments, "
                        "and merge operations before persisting dimensional models. The dbt project builds incremental models, and the resulting datasets feed "
                        "visualisations as well as the customer API."
                    ),
                ],
            ),
            Section(
                title="Component Interaction",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Airflow invokes dbt via KubernetesPodOperator or ECSOperator, ensuring execution parity across environments.",
                            "Jenkins pipelines publish application images to Amazon ECR and trigger ECS rolling updates with health checks.",
                            "Terraform outputs share load balancer endpoints, security group IDs, and credential references back to Jenkins for smoke testing.",
                        ]
                    ),
                ],
            ),
        ],
    )

    data_pipeline = Section(
        title="Data Pipeline Design",
        level="chapter",
        blocks=[
            Section(
                title="Source Systems",
                level="section",
                blocks=[
                    Paragraph(
                        "Order intake events, inventory adjustments, marketing campaign metadata, and customer service notes are synthesised to mirror enterprise "
                        "patterns. Each source publishes JSON payloads with schema versioning to simplify evolution."
                    ),
                ],
            ),
            Section(
                title="Airflow Orchestration",
                level="section",
                blocks=[
                    Paragraph(
                        "Two primary DAGs run on staggered schedules: the order generator and the end-to-end data pipeline. Task groups isolate staging, validation, "
                        "transformation, and reporting phases."
                    ),
                    BulletList(
                        [
                            "Automatic retries with exponential backoff for transient failures.",
                            "Dataset-level SLAs tracked with Airflow's alerting mechanisms.",
                            "Config-driven environment variables for bucket names, prefixes, and schema locations.",
                        ]
                    ),
                ],
            ),
            Section(
                title="dbt Modelling",
                level="section",
                blocks=[
                    Paragraph(
                        "The dbt project structures staging, intermediate, and mart models. Macros enforce naming conventions, and tests cover relationships, uniqueness, "
                        "and freshness. Snapshots preserve slowly changing dimension history."
                    ),
                ],
            ),
            Section(
                title="Data Quality Controls",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Great Expectations-style assertions within Airflow operators for row counts, null ratios, and schema compatibility.",
                            "dbt tests run within CI pipelines to prevent regressions before deployment.",
                            "MinIO-based quarantine buckets capture anomalous files for investigation.",
                        ]
                    ),
                ],
            ),
        ],
    )

    customer_app = Section(
        title="Customer Application Experience",
        level="chapter",
        blocks=[
            Paragraph(
                "The customer-facing web application builds on React and Tailwind CSS, consuming the same API layer surfaced by the data pipeline. User journeys include "
                "order tracking, personalised recommendations, and loyalty insights."
            ),
            Section(
                title="Frontend Architecture",
                level="section",
                blocks=[
                    Paragraph(
                        "Component-based design patterns enable reuse across dashboards. State management leverages Redux Toolkit, and API clients utilise Axios with interceptors "
                        "for authentication and telemetry."
                    ),
                    BulletList(
                        [
                            "Responsive layouts supporting desktop, tablet, and mobile breakpoints.",
                            "Accessibility-first semantics with WCAG 2.1 AA targets.",
                            "Feature flags delivered through environment variables to toggle beta modules.",
                        ]
                    ),
                ],
            ),
            Section(
                title="API Layer",
                level="section",
                blocks=[
                    Paragraph(
                        "FastAPI orchestrates REST endpoints packaged into containers. Routes cover customer profiles, orders, inventory lookups, and marketing banners. JSON Web Tokens "
                        "secure the endpoints, with scope-based authorisation for support teams versus end customers."
                    ),
                ],
            ),
            Section(
                title="Performance Considerations",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Server-side caching for personalised recommendations to meet sub-200ms response targets.",
                            "CDN-backed static asset delivery through Amazon CloudFront (or Azure Front Door).",
                            "Synthetic monitoring via lightweight Playwright scripts executed post-deployment.",
                        ]
                    ),
                ],
            ),
        ],
    )

    infrastructure = Section(
        title="Infrastructure Automation",
        level="chapter",
        blocks=[
            Paragraph(
                "Terraform codifies VPCs, ECS services, RDS instances, S3 buckets, and IAM policies. Modules parameterise provider-specific attributes, enabling a swap between AWS and Azure "
                "with minimal changes to variables."
            ),
            Section(
                title="Module Strategy",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Core networking module defines CIDR blocks, subnets, route tables, and security groups.",
                            "Data services module provisions PostgreSQL, S3 buckets, and KMS keys.",
                            "Application module deploys ECS clusters, task definitions, and load balancers.",
                            "Jenkins module configures EC2 (or Azure VM) hosts with bootstrap scripts for Terraform, Docker, and pipeline agents.",
                        ]
                    ),
                ],
            ),
            Section(
                title="Environment Configuration",
                level="section",
                blocks=[
                    Paragraph(
                        "Separate `qa` and `main` variable files tune capacity, instance sizes, and observability flags. Workspace usage keeps state isolated per environment."
                    ),
                    TableBlock(
                        headers=["Setting", "QA Branch", "Main Branch"],
                        rows=[
                            ["Fargate Task Count", "1 per service", "2 per service"],
                            ["Database Class", "db.t3.small", "db.m5.large"],
                            ["NAT Gateway", "Disabled", "Enabled"],
                            ["Alerting", "Slack webhooks", "Slack + PagerDuty"],
                        ],
                        caption="Key infrastructure parameter differences",
                    ),
                ],
            ),
            Section(
                title="Azure Portability",
                level="section",
                blocks=[
                    Paragraph(
                        "Provider-agnostic variables abstract network CIDR ranges, container registries, secret stores, and monitoring endpoints. Implementing the Azure module requires mapping these "
                        "variables to Azure Virtual Networks, Container Apps, Key Vault, and Application Insights."
                    ),
                ],
            ),
        ],
    )

    ci_cd = Section(
        title="Continuous Integration and Delivery",
        level="chapter",
        blocks=[
            Paragraph(
                "Jenkins orchestrates build, test, security scanning, and deployment stages. Pipelines are declarative with shared libraries for Terraform wrappers and notification hooks."
            ),
            Section(
                title="Pipeline Stages",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Checkout and dependency caching.",
                            "Static code analysis via Flake8, Bandit, and SonarQube scanners.",
                            "Unit and integration testing triggered per branch.",
                            "Docker image build, tagging, and push to Amazon ECR (or Azure Container Registry).",
                            "Terraform plan and apply stages gated by approval for the main branch.",
                        ]
                    ),
                ],
            ),
            Section(
                title="Quality Gates",
                level="section",
                blocks=[
                    Paragraph(
                        "SonarQube enforces code coverage, duplication, and security standards. OWASP ZAP baseline scans detect regressions in the customer application before promotion."
                    ),
                ],
            ),
            Section(
                title="Release Management",
                level="section",
                blocks=[
                    Paragraph(
                        "QA branch deployments provision ephemeral infrastructure for user acceptance testing. Once approved, the main branch pipeline promotes artefacts and applies Terraform changes with "
                        "blue/green-style ECS updates."
                    ),
                ],
            ),
        ],
    )

    security = Section(
        title="Security and Compliance",
        level="chapter",
        blocks=[
            Paragraph(
                "Security is embedded across the stack: network segmentation, encryption, identity governance, and observability."
            ),
            Section(
                title="Identity and Access Management",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Least-privilege IAM roles for Airflow, dbt, ECS tasks, and Jenkins agents.",
                            "Secrets stored in AWS Systems Manager Parameter Store with envelope encryption.",
                            "Multi-factor authentication enforced for console and bastion access.",
                        ]
                    ),
                ],
            ),
            Section(
                title="Data Protection",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "TLS termination at the application load balancer with automatic certificate rotation.",
                            "KMS-managed encryption for S3 buckets and RDS storage.",
                            "Audit trails captured through CloudTrail and forwarded to a central log bucket.",
                        ]
                    ),
                ],
            ),
            Section(
                title="Governance and Compliance",
                level="section",
                blocks=[
                    Paragraph(
                        "Policies align with GDPR and CCPA for customer data minimisation and retention. Automated policy-as-code checks via Terraform Cloud or Open Policy Agent validate infrastructure changes."
                    ),
                ],
            ),
        ],
    )

    testing = Section(
        title="Testing Strategy",
        level="chapter",
        blocks=[
            Paragraph(
                "Testing spans unit, integration, system, performance, and user acceptance layers. Test data management ensures consistent results across runs."
            ),
            Section(
                title="Automated Testing",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Pytest-based unit tests cover data transformation helpers and API utilities.",
                            "dbt `run` and `test` commands executed in CI to validate SQL models.",
                            "Containerised integration suites spin up temporary Postgres and MinIO instances for end-to-end verification.",
                        ]
                    ),
                ],
            ),
            Section(
                title="Performance and Load",
                level="section",
                blocks=[
                    Paragraph(
                        "Locust scenarios simulate concurrent order lookups and marketing banner rotations. Metrics feed into Jenkins to track latency thresholds over time."
                    ),
                ],
            ),
            Section(
                title="User Acceptance Testing",
                level="section",
                blocks=[
                    Paragraph(
                        "QA environments allow merchandisers and customer support representatives to validate workflows before release. Feedback loops integrate into Jira for rapid iteration."
                    ),
                ],
            ),
        ],
    )

    operations = Section(
        title="Operations and Monitoring",
        level="chapter",
        blocks=[
            Section(
                title="Observability Stack",
                level="section",
                blocks=[
                    Paragraph(
                        "Metrics collected through CloudWatch Container Insights, Application Load Balancer access logs, and custom business KPIs exported from Airflow."
                    ),
                ],
            ),
            Section(
                title="Alerting",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Slack notifications for build failures and Airflow SLA misses.",
                            "PagerDuty escalations for production incidents exceeding defined thresholds.",
                            "Daily health summaries combining pipeline statistics and application uptime.",
                        ]
                    ),
                ],
            ),
            Section(
                title="Runbooks",
                level="section",
                blocks=[
                    Paragraph(
                        "Runbooks outline recovery steps for ingestion backlog, ECS deployment rollback, and database failover. They include decision matrices, command snippets, and escalation contacts."
                    ),
                ],
            ),
        ],
    )

    management = Section(
        title="Project Management",
        level="chapter",
        blocks=[
            Paragraph(
                "Delivery followed an agile cadence with two-week sprints, backlog grooming, and regular stakeholder demos."
            ),
            Section(
                title="Timeline",
                level="section",
                blocks=[
                    TableBlock(
                        headers=["Phase", "Duration", "Key Deliverables"],
                        rows=[
                            ["Initiation", "2 weeks", "Charter, stakeholder alignment"],
                            ["Architecture & Design", "4 weeks", "Solution blueprints, tech stack selection"],
                            ["Implementation", "10 weeks", "Data pipeline, customer app, Terraform modules"],
                            ["Testing & Hardening", "4 weeks", "Performance tuning, security reviews"],
                            ["Deployment", "2 weeks", "Production rollout, documentation"],
                        ],
                    ),
                ],
            ),
            Section(
                title="Resource Plan",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Product Owner providing continuous backlog prioritisation.",
                            "Data Engineer, Analytics Engineer, and Backend Engineer collaborating on ingestion and modelling.",
                            "Frontend Engineer and UX Designer crafting the customer experience.",
                            "DevOps Engineer maintaining CI/CD and infrastructure automation.",
                        ]
                    ),
                ],
            ),
            Section(
                title="Communication",
                level="section",
                blocks=[
                    Paragraph(
                        "Weekly status reports, daily stand-ups, and stakeholder reviews ensured transparency and rapid risk mitigation."
                    ),
                ],
            ),
        ],
    )

    risk = Section(
        title="Risk Assessment and Mitigation",
        level="chapter",
        blocks=[
            TableBlock(
                headers=["Risk", "Impact", "Probability", "Mitigation"],
                rows=[
                    [
                        "Cloud service quota exhaustion",
                        "Delays in provisioning infrastructure",
                        "Medium",
                        "Monitor AWS service quotas and request increases ahead of load tests.",
                    ],
                    [
                        "Data quality regressions",
                        "Incorrect KPIs affecting decisions",
                        "Medium",
                        "Automated validation with alerting and data steward review.",
                    ],
                    [
                        "Pipeline deployment failure",
                        "Extended downtime for services",
                        "Low",
                        "Blue/green deployments with automated rollback via ECS and Jenkins.",
                    ],
                    [
                        "Skill gaps for Azure migration",
                        "Slower adoption of alternate cloud",
                        "Medium",
                        "Documented abstraction layers and cross-training sessions.",
                    ],
                ],
                caption="Risk register snapshot",
            ),
            Section(
                title="Assumptions",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Student AWS accounts maintain baseline service availability throughout the academic term.",
                            "Business stakeholders are available for UAT sign-off each sprint.",
                            "Data privacy requirements remain consistent during project delivery.",
                        ]
                    ),
                ],
            ),
        ],
    )

    financials = Section(
        title="Cost Optimisation",
        level="chapter",
        blocks=[
            Paragraph(
                "Cost governance focuses on leveraging free-tier or student-program entitlements wherever possible while planning for production-ready scaling."
            ),
            Section(
                title="AWS Cost Profile",
                level="section",
                blocks=[
                    TableBlock(
                        headers=["Service", "QA Estimate", "Main Estimate", "Notes"],
                        rows=[
                            ["ECS Fargate", "$35/month", "$140/month", "Autoscaling adjusts tasks during campaigns."],
                            ["RDS PostgreSQL", "$45/month", "$220/month", "Reserved instances reduce steady-state costs."],
                            ["S3 Storage", "$5/month", "$15/month", "Lifecycle policies transition logs to Glacier."],
                            ["Jenkins EC2", "$20/month", "$40/month", "Spot instances during non-peak hours."],
                        ],
                    ),
                ],
            ),
            Section(
                title="Azure Equivalents",
                level="section",
                blocks=[
                    Paragraph(
                        "Equivalent services include Azure Container Apps, Azure Database for PostgreSQL Flexible Server, Azure Blob Storage, and Azure DevOps or Jenkins on Azure VM. Cost calculators map the same "
                        "utilisation profiles to ensure comparability."
                    ),
                ],
            ),
            Section(
                title="Optimisation Strategies",
                level="section",
                blocks=[
                    BulletList(
                        [
                            "Automated shutdown of non-production environments outside business hours.",
                            "Rightsizing through monthly review of CloudWatch utilisation metrics.",
                            "Use of serverless offerings (Lambda, Azure Functions) for burst workloads such as batch enrichment jobs.",
                        ]
                    ),
                ],
            ),
        ],
    )

    future = Section(
        title="Future Enhancements",
        level="chapter",
        blocks=[
            Paragraph(
                "The modular design enables incremental adoption of advanced analytics and experience features."
            ),
            BulletList(
                [
                    "Introduce machine learning models for personalised recommendations using Amazon SageMaker or Azure Machine Learning.",
                    "Expand the customer portal with proactive delivery notifications and augmented reality product previews.",
                    "Adopt event-driven microservices for payment, loyalty, and returns to decouple teams further.",
                    "Integrate data governance catalogues such as DataHub or Azure Purview for lineage and stewardship.",
                ]
            ),
        ],
    )

    conclusion = Section(
        title="Conclusion",
        level="chapter",
        blocks=[
            Paragraph(
                "The ecommerce data pipeline and customer application deliver a cohesive platform that accelerates insight-to-action loops. Terraform and Jenkins automation lower the barrier to repeatable deployments, while the "
                "cloud-neutral approach keeps future strategic options open."
            ),
            Paragraph(
                "With observability, testing, and governance embedded across the lifecycle, the organisation can confidently evolve the solution, onboard new data domains, and support global customer experiences."
            ),
        ],
    )

    glossary = Section(
        title="Glossary",
        level="chapter",
        blocks=[
            TableBlock(
                headers=["Term", "Definition"],
                rows=[
                    ["Airflow", "Open-source workflow orchestrator for authoring, scheduling, and monitoring data pipelines."],
                    ["dbt", "Data build tool used to transform data in warehouses through SQL and testing frameworks."],
                    ["ECS Fargate", "Serverless compute engine for containers managed by Amazon Elastic Container Service."],
                    ["Infrastructure-as-Code", "Approach of managing infrastructure through declarative configuration files."],
                    ["KPI", "Key Performance Indicator quantifying business objectives."],
                    ["Terraform", "HashiCorp tool for building, changing, and versioning infrastructure safely."],
                ],
            ),
        ],
    )

    references = Section(
        title="References",
        level="chapter",
        blocks=[
            BulletList(
                ordered=True,
                items=[
                    "AWS Architecture Center. 'Deploying Containerized Applications on AWS Fargate'.",
                    "dbt Labs. 'dbt Documentation and Best Practices'.",
                    "Apache Airflow. 'Airflow Scheduler Concepts'.",
                    "HashiCorp. 'Terraform Module Design Guidelines'.",
                    "OWASP Foundation. 'Zed Attack Proxy Baseline Scan'.",
                    "Microsoft. 'Azure Container Apps Overview'.",
                ],
            ),
        ],
    )

    appendices = [
        Section(
            title="Appendix A: Jenkins Pipeline Listing",
            level="appendix",
            blocks=[
                Paragraph(
                    "The appendix summarises the declarative stages configured in Jenkins, highlighting shared libraries, Terraform wrappers, and notification hooks used across QA and main branch pipelines."
                ),
            ],
        ),
        Section(
            title="Appendix B: Environment Variable Catalogue",
            level="appendix",
            blocks=[
                TableBlock(
                    headers=["Variable", "Description", "Scope"],
                    rows=[
                        ["DATA_PIPELINE_SOURCE_DIR", "Override path for synthetic CSV inputs", "Airflow"],
                        ["DBT_TARGET", "Environment profile executed by dbt", "Airflow, Jenkins"],
                        ["REACT_APP_API_URL", "Endpoint for customer API", "Customer App"],
                        ["TERRAFORM_VAR_file", "Selected variable set for environment", "CI/CD"],
                    ],
                ),
            ],
        ),
    ]

    return [
        front_matter,
        introduction,
        problem_statement,
        requirements,
        architecture,
        data_pipeline,
        customer_app,
        infrastructure,
        ci_cd,
        security,
        testing,
        operations,
        management,
        risk,
        financials,
        future,
        conclusion,
        glossary,
        references,
        *appendices,
    ]


def generate_latex_file(sections: Sequence[Section]) -> None:
    lines = [
        r"\documentclass[11pt,oneside]{report}",
        r"\usepackage[margin=1in]{geometry}",
        r"\usepackage{longtable}",
        r"\usepackage{hyperref}",
        r"\usepackage{titlesec}",
        r"\usepackage{enumitem}",
        r"\usepackage{caption}",
        r"\hypersetup{colorlinks=true, linkcolor=blue, urlcolor=blue}",
        r"\setlist{leftmargin=1.25cm}",
        r"\titleformat{\chapter}[display]{\bfseries\Huge}{\chaptername\ \thechapter}{20pt}{\Huge}",
        r"\begin{document}",
        r"\begin{titlepage}",
        r"  \centering",
        r"  {\Huge Ecommerce Data Pipeline and Customer Application\\[1cm]}",
        r"  {\Large Comprehensive Project Report\\[0.5cm]}",
        r"  {\large Generated by the Automation Toolkit\\[0.5cm]}",
        r"  {\large \today}\\[2cm]",
        r"  \vfill",
        r"  {\large Data Engineering | DevOps | Cloud Architecture}",
        r"\end{titlepage}",
        r"\pagenumbering{roman}",
        r"\tableofcontents",
        r"\cleardoublepage",
        r"\pagenumbering{arabic}",
    ]

    appendix_started = False
    for section in sections:
        if section.level == "appendix" and not appendix_started:
            lines.append(r"\appendix")
            appendix_started = True
        lines.append(section_to_latex(section))
        lines.append("")

    lines.append(r"\end{document}")
    LATEX_OUTPUT.write_text("\n".join(lines), encoding="utf-8")


def generate_pdf_file(sections: Sequence[Section]) -> None:
    pdf = SimplePDF()
    for section in sections:
        pdf.add_lines(section_to_plain_text(section))
        pdf.add_lines([""])
    pdf.write(PDF_OUTPUT)


def main() -> None:
    sections = build_report_structure()
    generate_latex_file(sections)
    generate_pdf_file(sections)
    print(f"Generated {LATEX_OUTPUT} and {PDF_OUTPUT}")


if __name__ == "__main__":
    main()
