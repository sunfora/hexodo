#
# @user: kurku
# @mail: sandovin@mail.ru
# @date: Mon May 11 09:57:36 PM MSK 2026
#
# Include project.sh to perform other actions and locate libs.
PROJECT_PATH=`git rev-parse --show-toplevel`
source "$PROJECT_PATH"/env/project.sh

# Backups the database
#
# Usage:
#   db.backup [path_to_database] [path_to_backups]
#
# Params:
#   path_to_database — relative path to database
#   path_to_backups  — relative path to backups
db.backup () {
  local root=`project.root`
  
  local path_to_db=${1:-"db/tokoharu.db"}
  local path_to_backups=${2:-"db/backups"}
  local name=`basename "$path_to_db"`

  local date_format="%Y-%m-%d_%H-%M-%S"
  local backup_prefix_now=`date +$date_format`

  pushd $root > /dev/null
  {
    cp "$path_to_db" "${path_to_backups}/${backup_prefix_now}__${name}"
  }
  popd > /dev/null
}
