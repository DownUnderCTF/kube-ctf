locals {
  gcp_service_list = [
    "container.googleapis.com"
  ]
}

resource "google_project_service" "gcp_services" {
  for_each = toset(local.gcp_service_list)
  project = var.project_id
  service = each.key
}
