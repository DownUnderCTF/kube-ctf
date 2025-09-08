terraform {
  backend "gcs" {
    bucket  = ""
    prefix  = ""
  }
}


variable "region" {
  type        = string
  description = "GCP Region"
}
variable "project_id" {
  type = string
  description = "GCP Project"
}
variable "name" {
  type = string
  default = "ctf"
  description = "Name of deployment"
}
variable "cluster_version" {
  type = string
  default = "1.32.6-gke.1060000"
  description = "Kubernetes cluster version"
}
variable "cluster_autoscaling_profile" {
  type = string
  default = "OPTIMIZE_UTILIZATION"
  description = "Autoscaling profile"
}
variable "cluster_pools" {
  type = map(object({
    machine_type = string
    disk_size_gb = number
    disk_type = string
    total_min_node_count = number # per zone
    total_max_node_count = number # per zone
    preemptible = optional(bool, false)
  }))

  default = {
    primary = {
      machine_type = "e2-standard-2"
      disk_size_gb = 30
      disk_type = "pd-standard"
      total_min_node_count = 1
      total_max_node_count = 1
    }
  }
}

provider "google" {
  project     = var.project_id
  region      = var.region
}
