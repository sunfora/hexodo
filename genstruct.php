#!/usr/bin/env php
<?php

$line = trim(file_get_contents("php://stdin"));

class Parser {
    private $input;
    private $pos = 0;
    private $len;
    private $ch;

    public function __construct($input) {
        $this->input = $input;
        $this->len = strlen($input);
        $this->ch = $this->input[0] ?? null;
    }

    private function nextChar() {
        $this->pos++;
        $this->ch = $this->pos < $this->len ? $this->input[$this->pos] : null;
    }

    private function skipWhitespace() {
        while ($this->ch !== null && ctype_space($this->ch)) {
            $this->nextChar();
        }
    }

    private function parseIdentifier() {
        $this->skipWhitespace();
        $start = $this->pos;
        if ($this->ch === null || !preg_match('/[A-Za-z_]/', $this->ch)) {
            throw new Exception("Expected identifier at pos $this->pos");
        }
        while ($this->ch !== null && preg_match('/[A-Za-z0-9_]/', $this->ch)) {
            $this->nextChar();
        }
        return substr($this->input, $start, $this->pos - $start);
    }

    private function match($expected) {
        $this->skipWhitespace();
        $len = strlen($expected);
        if (substr($this->input, $this->pos, $len) === $expected) {
            for ($i=0; $i<$len; $i++) $this->nextChar();
            return true;
        }
        return false;
    }

    private function parseOptionalMark() {
        $this->skipWhitespace();
        if ($this->ch === '?') {
            $this->nextChar();
            return true;
        }
        return false;
    }

    private function parseDefaultValue() {
        $this->skipWhitespace();
        if ($this->ch === '=') {
            $this->nextChar();
            $this->skipWhitespace();
            // parse simple literal default value (number or string without quotes)
            $start = $this->pos;
            while ($this->ch !== null && !in_array($this->ch, [',', ')', ' '])) {
                $this->nextChar();
            }
            return trim(substr($this->input, $start, $this->pos - $start));
        }
        return null;
    }

    public function parseStruct() {
        $this->skipWhitespace();
        if (!$this->match('struct')) {
            throw new Exception("Expected 'struct'");
        }

        $name = $this->parseIdentifier();

        $this->skipWhitespace();
        if (!$this->match('(')) {
            throw new Exception("Expected '('");
        }

        $fields = $this->parseFields();

        $this->skipWhitespace();
        if (!$this->match(')')) {
            throw new Exception("Expected ')'");
        }

        return ['name' => $name, 'fields' => $fields];
    }

    private function parseFields() {
        $fields = [];
        while (true) {
            $this->skipWhitespace();
            if ($this->ch === ')' || $this->ch === null) break;

            $fieldName = $this->parseIdentifier();
            $optional = $this->parseOptionalMark();

            $type = 'any';
            $this->skipWhitespace();
            if ($this->match(':')) {
                $type = $this->parseIdentifier();
            }

            $default = $this->parseDefaultValue();

            $fields[] = [
                'name' => $fieldName,
                'optional' => $optional,
                'type' => $type,
                'default' => $default
            ];

            $this->skipWhitespace();
            if ($this->ch === ',') {
                $this->nextChar();
                continue;
            } else {
                break;
            }
        }
        return $fields;
    }
}

function makeEquals($first, $second, $fields) {
    $equalsConditions = array_map(
        fn($f) => "$first.{$f['name']} === $second.{$f['name']}",
        $fields
    );
    $equalsBody = implode(" &&\n           ", $equalsConditions);
    return $equalsBody;
} 

function makeClone($fields) {
    $cloneAssigns = array_map(
        fn($f) => "const {$f['name']} = this.{$f['name']}",
        $fields
    );
    $cloneBody = implode(";\n    ", $cloneAssigns);
    return $cloneBody;
} 

try {
    $parser = new Parser($line);
    $struct = $parser->parseStruct();

    $name = $struct['name'];
    $fields = $struct['fields'];

    $ctorParams = implode(', ', array_map(fn($f) => $f['name'], $fields));

    $ctorJsdoc = '';
    foreach ($fields as $f) {
        $optMark = $f['optional'] ? '=' : '';
        $ctorJsdoc .= "   * @param {{$f['type']}$optMark} {$f['name']}\n";
    }

    $ctorBody = '';
    foreach ($fields as $f) {
        $field = $f['name'];
        if ($f['optional'] || $f['default'] !== null) {
            $defaultVal = $f['default'] ?? 'undefined';
            $ctorBody .= "    this.$field = $field === undefined ? $defaultVal : $field;\n";
        } else {
            $ctorBody .= "    this.$field = $field;\n";
        }
    }

    $recSetters = '';
    foreach ($fields as $f) {
        $field = $f['name'];
        if ($f['optional'] || $f['default'] !== null) {
            $defaultVal = $f['default'] ?? 'undefined';
            $recSetters .= "    target.$field = ($field === undefined)? $defaultVal : $field;\n";
        } else {
            $recSetters .= "    target.$field = $field;\n";
        }
    }
    
    $equalsBody = makeEquals('this', 'other', $fields);
    $staticEqualsBody = makeEquals('first', 'second', $fields);
    $cloneBody = makeClone($fields);

    $code = <<<JS
/**
 * $line
 */
class $name {
  /**
$ctorJsdoc   */
  constructor($ctorParams) {
$ctorBody  }

  /** 
   * Reuse the $name.
   * NOTE(ivan): unchecked, be sure it really is an object of proper type.
   * @param {{$name}} target 
   * 
$ctorJsdoc   */
  static rec(target, $ctorParams) {
$recSetters    return target;
  }

  /** 
   * Reuse the $name or new if target is wrong type.
   * USAGE(ivan): for object pooling and other gc lowerage
   *
   * @param {?$name} target 
   *
$ctorJsdoc   */
  static recOrNew(target, $ctorParams) {
    return target instanceof $name
      ? $name.rec(target, $ctorParams)
      : new $name($ctorParams);
  }

  /** 
   * Compare two objects 
   * USAGE(ivan): typesafe comparasion 
   *
   * @param {?$name} first
   * @param {?$name} second 
   *
$ctorJsdoc   */
  static equals(first, second) {
    return first  instanceof $name &&
           second instanceof $name &&
           {$staticEqualsBody}
  }

  /** 
   * Compares two $name structs.
   * @param {{$name}} other 
   */
  equals(other) {
    return other instanceof $name &&
           {$equalsBody};
  }

  /** 
   * Clones $name.
   */
  clone() {
    {$cloneBody}
    return new $name($ctorParams);
  }

  /** 
   * Copies contents of this $name to other
   * @param {{$name}} other
   */
  copy(other) {
    {$cloneBody}
    return $name.rec(other, $ctorParams);
  }
}
JS;

    echo $code, "\n";

} catch (Exception $e) {
    fwrite(STDERR, "Parse error: " . $e->getMessage() . "\n");
    exit(1);
}
