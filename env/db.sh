#
# @user: kurku
# @mail: sandovin@mail.ru
# @date: Mon May 11 09:57:36 PM MSK 2026
#
# Include project.sh to perform other actions and locate libs.
PROJECT_PATH=`git rev-parse --show-toplevel`
source "$PROJECT_PATH"/env/project.sh

# Absolute path to current database
#
# Stdout:
#   db path
db.path.database () {
  echo "$(project.root)/db/tokoharu.db"
}

# Absolute path to backups folder 
#
# Stdout:
#   backups path 
db.path.backups () {
  echo "$(project.root)/db/backups"
}
# Absolute path to migrations folder 
#
# Stdout:
#   migrations path 
db.path.migrations () {
  echo "$(project.root)/db/migrations"
}

# Backups the database
#
# Usage:
#   db.backup
db.backup () {
  local root=`project.root`
  
  local path_to_db="$(db.path.database)"
  local path_to_backups="$(db.path.backups)"
  local name=`basename "$path_to_db"`

  local date_format="%Y-%m-%d_%H-%M-%S"
  local backup_prefix_now=`date +$date_format`

  cp "$path_to_db" "${path_to_backups}/${backup_prefix_now}__${name}"
}

# Creates new migration file
#
# Usage:
#   db.create_migration <name>
#
db.create_migration () {
  local root=`project.root`

  if [[ -z "$1" ]]; then
    echo "please specify a name"
    return 1
  fi

  local name="$1"

  local path_to_db="$(db.path.database)"
  local path_to_migrations="$(db.path.migrations)"

  local date_format="%Y-%m-%d_%H-%M-%S"
  local backup_prefix_now=`date +$date_format`

  touch "${path_to_migrations}/${backup_prefix_now}__${name}.sql"
}

db.latest_backup () {
  local backup_name=$(ls "$(db.path.backups)" | sort | tail -1)
  echo "$(db.path.backups)/$backup_name"
}

db.restore () {
  if [[ -z "$1" ]]; then
    echo "please specify a backup"
    return 1
  fi
  
  local backup="$1"

  cp "$backup" "$(db.path.database)"
}

db.apply_migrations() {
  local from=${1:-0}
  local upto=${2:-latest}
  
  local db_path="$(db.path.database)"
  local migration_dir="$(db.path.migrations)"

  local files=()
  local files_count
  local selected_count

  for file in "$migration_dir"/*.sql; do
    files+=("$file")
  done
  files_count=${#files[@]}

  if [[ "$upto" == "latest" ]]; then
    upto=$((files_count))
  fi

  selected_count=$(( upto - from ))

  if (( from >= files_count || selected_count <= 0 )); then
    echo "No migrations to apply in range $from to $upto."
    return 0
  fi

  local slice=("${files[@]:from:selected_count}")

  echo "Applying migrations $from to $upto ($selected_count files) inside a single transaction..."

  sqlite3 -bail "$db_path" <<EOF
BEGIN TRANSACTION;
$(
  for file in "${slice[@]}"; do
    echo "-- Migration: \$(basename "$file")"
    cat "$file"
    echo ""
  done
)
COMMIT;
EOF

  local exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    echo "ERROR: Migration transaction failed! Changes rolled back completely." >&2
    return 1
  fi

  echo "Success: All migrations applied cleanly."
  return 0
}
