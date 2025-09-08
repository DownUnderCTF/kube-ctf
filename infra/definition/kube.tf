resource "google_compute_network" "ctf" {
  name = var.name
}

resource "google_container_cluster" "ctf" {
  name = var.name
  location = var.region
  network = google_compute_network.ctf.self_link
  subnetwork = null

  min_master_version = var.cluster_version
  enable_shielded_nodes = true
  datapath_provider = "ADVANCED_DATAPATH"
  release_channel {
    channel = "REGULAR"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
  ip_allocation_policy {
    cluster_ipv4_cidr_block  = ""
    services_ipv4_cidr_block = ""
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block = "0.0.0.0/0"
    }
  }

  addons_config {
    horizontal_pod_autoscaling {
      disabled = false
    }
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
  }

  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  cluster_autoscaling {
    autoscaling_profile = var.cluster_autoscaling_profile
  }

  # This is throwaway since we want another pool anyways
  node_config {
    disk_size_gb = 16
  }

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count = 1
  deletion_protection = false

  depends_on = [
    google_project_service.gcp_services["container.googleapis.com"]
  ]
}

resource "google_container_node_pool" "ctf" {
  for_each   = var.cluster_pools
  name       = each.key
  location   = var.region
  cluster    = google_container_cluster.ctf.name
  
  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }

  autoscaling {
    total_min_node_count = each.value.total_min_node_count
    total_max_node_count = each.value.total_max_node_count
  }

  node_config {
    preemptible  = each.value.preemptible
    machine_type = each.value.machine_type
    image_type = "COS_CONTAINERD"
    disk_type =  each.value.disk_type
    disk_size_gb = each.value.disk_size_gb
    
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
    oauth_scopes = [
      "https://www.googleapis.com/auth/devstorage.read_only",
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
      "https://www.googleapis.com/auth/servicecontrol",
      "https://www.googleapis.com/auth/service.management.readonly",
      "https://www.googleapis.com/auth/trace.append"
    ]

    metadata = {
      disable-legacy-endpoints = true
    }
  }
}
