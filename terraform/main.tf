module "networking" {
  source = "./modules/networking"

  project                 = var.project
  vpc_cidr                = var.vpc_cidr
  availability_zones      = var.availability_zones
  public_subnet_cidrs     = var.public_subnet_cidrs
  private_subnet_cidrs    = var.private_subnet_cidrs
  monitoring_allowed_cidr = var.monitoring_allowed_cidr
}

module "database" {
  source = "./modules/database"

  project            = var.project
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  rds_sg_id          = module.networking.rds_sg_id
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  db_instance_class  = var.db_instance_class
}

module "ecs" {
  source = "./modules/ecs"

  project             = var.project
  aws_region          = var.aws_region
  vpc_id              = module.networking.vpc_id
  public_subnet_ids   = module.networking.public_subnet_ids
  private_subnet_ids  = module.networking.private_subnet_ids
  alb_sg_id           = module.networking.alb_sg_id
  backend_sg_id       = module.networking.backend_sg_id
  frontend_sg_id      = module.networking.frontend_sg_id
  backend_image       = var.backend_image
  frontend_image      = var.frontend_image
  db_url              = module.database.connection_url
  jwt_secret          = var.jwt_secret
  unsplash_access_key = var.unsplash_access_key
  session_secret      = var.session_secret
}

module "observability" {
  source = "./modules/observability"

  project                  = var.project
  vpc_id                   = module.networking.vpc_id
  public_subnet_id         = module.networking.public_subnet_ids[0]
  monitoring_sg_id         = module.networking.monitoring_sg_id
  backend_alb_dns          = module.ecs.alb_dns_name
  grafana_admin_password   = var.grafana_admin_password
  monitoring_instance_type = var.monitoring_instance_type
  key_pair_name            = var.key_pair_name
}
