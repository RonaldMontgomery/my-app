# Lab 8: Kubernetes and Cloud Native Security

## Objective

Deploy my application to a local Kubernetes cluster, enforce workload security requirements, demonstrate rejection of a noncompliant change, and remediate at least three CIS benchmark findings.

## Environment

- Application: my-app, using the locally built my-app:after image.
- Application user: numeric UID 65532.
- Application port: 3000.
- Cluster: kind cluster lab8, running Kubernetes v1.34.0.
- Application namespace: lab8.
- Admission controller: Kyverno v1.19.0.
- Assessment tool: kube-bench v0.16.0.
- Audit namespace: lab8-audit.

The image was loaded directly into kind before deployment. The baseline Deployment rolled out successfully, and application logs confirmed that it was listening on port 3000.

## Pod Security Admission

I labeled the lab8 namespace to enforce the Restricted Pod Security Standard, pinned to v1.34, then restarted the Deployment.

Kubernetes rejected replacement Pods because the manifest lacked four explicit settings:

- allowPrivilegeEscalation: false
- capabilities.drop: ["ALL"]
- runAsNonRoot: true
- seccompProfile.type: RuntimeDefault

The image already ran as UID 65532, but the Pod specification still needed to declare the required security settings. After adding them, the replacement Pod started successfully. I also disabled automatic service-account token mounting because the application does not need Kubernetes API access.

Evidence: evidence/pod-security-denial.txt, evidence/replicaset-denial.txt, evidence/deployment-restricted.yaml, and evidence/restricted-pod-logs.txt.

## Custom Kyverno Policy

The require-resource-limits policy requires CPU and memory limits on regular containers in namespace lab8. Namespace scoping prevents the rule from interfering with system components and the benchmark Job.

I first deployed a compliant configuration with CPU and memory requests and limits. I then applied a separate invalid manifest with the resources block removed.

Kyverno rejected the Deployment update with exit code 1 and the message:

"CPU and memory limits are required."

The denial identified require-resource-limits and its generated controller rule, autogen-check-resource-limits. Reapplying the compliant manifest reported the Deployment unchanged, and the application remained Running with zero restarts.

Evidence: k8s/policy.yaml, k8s/deployment-invalid.yaml, evidence/kyverno-denial.txt, and evidence/deployment-after-policy-test.yaml.

## Understanding Where Each Control Acts

Pod Security Admission rejected creation of replacement Pods. The Deployment restart request itself succeeded, but ReplicaSet events showed FailedCreate because the Pod template violated Restricted requirements.

Kyverno's generated controller rule rejected the invalid Deployment update directly, before a replacement Pod could be created.

kube-bench assessed cluster configuration. It reported findings but did not enforce admission rules or automatically apply fixes.

## CIS Assessment and Remediation

I ran the pinned kube-bench Job in lab8-audit because its host-process and filesystem access is incompatible with the Restricted application namespace.

The baseline scan ran after application hardening and admission-policy testing. The comparison below measures the additional node and scheduler changes made afterward.

| Check | Remediation | Before | After |
| --- | --- | --- | --- |
| 1.4.1 | Set scheduler --profiling=false | FAIL | PASS |
| 4.1.1 | Set kubelet service and active drop-in file permissions to 600 | FAIL | PASS |
| 4.1.9 | Set /var/lib/kubelet/config.yaml permissions to 600 | FAIL | PASS |

I backed up the affected files outside the static-Pod manifest directory before editing them. After the scheduler change, its live Pod included --profiling=false and became Ready. The node remained Ready, and the application remained Running.

The same kube-bench manifest was used for the before and after scans.

| Result | Before | After |
| --- | ---: | ---: |
| PASS | 63 | 66 |
| FAIL | 12 | 9 |
| WARN | 56 | 56 |

Evidence: evidence/kube-bench-before.txt, evidence/kube-bench-after.txt, evidence/kubelet-permissions-after.txt, and evidence/scheduler-pod-after.yaml.

## Challenges and Solutions

| Challenge | Resolution |
| --- | --- |
| Chocolatey downloads repeatedly failed | Downloaded kubectl directly from Kubernetes and verified its SHA256 checksum. |
| Installing kind pulled in a Docker Desktop installer and disrupted the existing installation | Backed up Docker's data disk, repaired the MSI installation, and confirmed existing images, containers, and volumes were visible afterward. |
| Docker's bundled kubectl was newer than the lab cluster's supported version range | Used kubectl v1.34.0 through a session-specific PowerShell alias. |
| PowerShell displayed native-command progress and warnings as red error records | Checked exit codes, resource status, and actual denial messages to distinguish progress from failures. |
| Deployment logs initially selected a terminating Pod | Queried the replacement Pod explicitly to verify its startup. |
| Kyverno warned that ClusterPolicy is deprecated | Retained the pinned lab version and verified policy readiness and actual enforcement; future maintenance should migrate the policy API. |

## Remaining Findings and Limitations

The final scan still reported nine failures and 56 warnings. This work demonstrates three verified remediations, not complete CIS compliance.

Manual warnings require individual review and supporting evidence; they should not automatically be interpreted as failed controls or reported as automated passes.

The node-file changes apply to this local kind cluster and will be lost when it is deleted. Recreating the cluster requires reapplying the documented remediations.

## Cleanup Status

After saving the submission evidence, I deleted the lab8 cluster with kind delete cluster --name lab8 and confirmed that it no longer appeared in kind get clusters.

## AI Assistance Disclosure

OpenAI ChatGPT assisted with command preparation, troubleshooting, interpretation of security findings, and drafting this writeup. The results reported here are based on commands I executed and the captured output from my local environment.

## CI Scan Review

Semgrep reported 12 findings after the lab artifacts were added. Four specific
historical evidence snapshots were excluded from source scanning so their
recorded contents could remain unchanged. Other evidence remains in scope.

A rule-specific suppression documents that the Kyverno validation pattern is
not a runnable Pod specification.

Three rule-specific exceptions retain the pinned upstream kube-bench Job used
for both scans. Root and host-process access support node inspection. The
missing explicit privilege-escalation restriction is accepted as a limitation
of this temporary lab audit configuration, not asserted to be necessary.
The audit ran in lab8-audit, and the cluster was deleted after evidence capture.

These changes affect scan scope and comments only. They do not remediate
additional cluster findings or change the recorded benchmark results.
Application manifests remain subject to the existing security checks.
