#
# @user: kurku
# @mail: sandovin@mail.ru
# @date: Mon May 11 09:30:36 PM MSK 2026
#


# Finds project root
# 
# Usage:
#   project.root
#
# Stdout:
#   A project root absolute path
project.root() {
  git rev-parse --show-toplevel
}

# Finds relative path to init sh file
#
# Usage:
#   project.bash.entry.relative
#
# Stdout:
#   Init file path
project.bash.entry.relative() {
  echo "env/project.sh"
}

# Current user name
# 
# Usage:
#   project.user.name
#
# Stdout:
#   A username
project.user.name() {
  git config user.name
}

# Current user mail 
#
# Usage:
#   project.user.mail
#
# Stdout:
#   A usermail
project.user.mail() {
  git config user.email
}

# Handles shell script boilerplate.
#
# Usage:
#   project.bash.create <script_path>
# 
# Params:
#   script_path — path to script to create
#
# Stdout:
#   A usermail
project.bash.create() {
  local script_path=$1

  if [[ -f "$script_path" ]]; then
  {
    echo "script $script_path already exists"
    return 1
  }
  fi

cat <<-EOF > "$script_path"
#
# @user: $(project.user.name)
# @mail: $(project.user.mail)
# @date: $(date)
#
# Include project.sh to perform other actions and locate libs.
PROJECT_PATH=\`git rev-parse --show-toplevel\`
source "\$PROJECT_PATH"/$(project.bash.entry.relative)

# Start here
{
}
EOF
}

# Locates libraries and lists available
#
# Usage:
#   1) project.locate            — To list available libraries.
#   2) project.locate <lib_name> — To get path to specific library.
# 
# Params:
#   lib_name — library name
#
# Stdout:
#   1) List of available libraries.
#   2) Path to library sources to load.
project.locate() {
  local lib_name=$1
  if [[ -z $lib_name ]]; then
  {
    echo "project"
    echo "db"
    return 0
  }
  fi
  
  case $lib_name in
    project) {
      echo "$(project.root)/$(project.bash.entry.relative)"
    } ;;
    db) {
      echo "$(project.root)/env/db.sh"
    } ;;
  esac
}
