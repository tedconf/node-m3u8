import argparse
import os
import re
import subprocess
from collections import Counter
from functools import lru_cache
from pathlib import Path

from tree_sitter_language_pack import get_parser


LANGUAGES = {
    ".cjs": "javascript",
    ".cts": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".mts": "typescript",
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".yaml": "yaml",
    ".yml": "yaml",
}
FILENAMES = {
}
SKIP_DIRS = {".terraform", ".yarn", "__generated__", "bower_components", "generated", "node_modules", "third_party", "vendor"}
SKIP_FILES = {".terraform.lock.hcl", ".rubocop_todo.yml", "gradlew", "gradlew.bat", "next-env.d.ts", "pnpm-lock.yaml", "schema.rb"}
GENERATED = re.compile(rb"(?im)^.{0,12}(?:@generated\b|code generated .*do not edit|this file (?:is |was )?auto[- ]?generated)")
ACTION_PIN = re.compile(rb"\s*(?:-\s+)?uses:\s*[\w./-]+@[a-f0-9]{40}\s+#\s*v?\d+(?:\.\d+){0,2}(?:[-+][\w.-]+)?\s*", re.I)
DIRECTIVE = re.compile(
    rb"^(?:@(?:jest-environment|vitest-environment|ts-(?:expect-error|ignore|check|nocheck|strict-ignore)|"
    rb"jsx(?:ImportSource|Runtime|Frag)?|testonly|license|preserve)\b|(?:eslint|stylelint)(?:-|\s)|"
    rb"(?:prettier|istanbul|c8|v8)[- ]ignore\b|(?:frozen_string_literal|encoding|typed|rubocop|sorbet):|"
    rb"shellcheck\s|(?:syntax|escape|check)=|(?:type:\s*ignore|noqa|coding[:=]|go:|\+build\b)|"
    rb"(?:SPDX-|copyright\b)|(?:@|#)?__PURE__\b|<reference\s|(?:globals?|exported)\s|"
    rb"(?:fmt|ruff|mypy|pylint|yamllint|swiftlint|ktlint|terraform-docs):|sourceMappingURL=|"
    rb"=(?:\s*require|\s*link|\s*depend_on)\b|(?:graphql-codegen|graphql-config):)",
    re.I,
)


def grammar(path, source):
    if SKIP_DIRS.intersection(path.parts) or path.name in SKIP_FILES:
        return None
    if path.name.endswith((".min.js", ".min.css", "_pb.rb", ".generated.ts")):
        return None
    if b"\0" in source[:8000] or GENERATED.search(source[:1400]):
        return None
    if path.name.split(".")[0] == "Dockerfile":
        return "dockerfile"
    result = FILENAMES.get(path.name) or LANGUAGES.get(path.suffix.lower())
    if result or not source.startswith(b"#!"):
        return result
    interpreter = re.search(rb"(?:/|\s)(bash|sh|zsh|ruby|python[23]?|node)(?:\s|$)", source.partition(b"\n")[0])
    if interpreter:
        name = interpreter[1].decode()
        return {"sh": "bash", "zsh": "bash", "node": "javascript", "python3": "python", "python2": "python"}.get(name, name)


parser_for = lru_cache(None)(get_parser)


def tokens(source, name):
    stack = [parser_for(name).parse(source).root_node]
    while stack:
        node = stack.pop()
        if "comment" in node.type.lower():
            yield node.start_byte, node.end_byte
        else:
            stack.extend(reversed(node.named_children))


def comments(path, source):
    name = grammar(path, source)
    if not name:
        return
    line = 1
    last = 0
    for start, end in tokens(source, name):
        line += source.count(b"\n", last, start)
        last = start
        raw = source[start:end].rstrip(b"\r\n")
        if raw.startswith(b"#!") and start == 0:
            continue
        if name == "yaml":
            beginning = source.rfind(b"\n", 0, start) + 1
            if ACTION_PIN.fullmatch(source[beginning:end]):
                continue
        if re.match(rb"<!--\s*(?:\[if\b|<!\[endif\]|\[endif\])", raw, re.I):
            continue
        body = raw.removeprefix(b"<!--").lstrip(b"/#*!- \t\r\n")
        if not DIRECTIVE.match(body):
            yield line, raw


def git(*args):
    return subprocess.check_output(["git", *args])


def paths(*args):
    return map(os.fsdecode, git(*args).split(b"\0")[:-1])


def changes(base):
    fields = iter(paths("diff", "--name-status", "-z", "-M", "--diff-filter=AMRT", base, "--"))
    for status in fields:
        first = Path(next(fields))
        if status.startswith("R"):
            yield first, Path(next(fields))
        else:
            yield None if status == "A" else first, first
    for path in paths("ls-files", "--others", "--exclude-standard", "-z"):
        yield None, Path(path)


def main():
    args = argparse.ArgumentParser(description="Reject prose comments added since the merge base.")
    args.add_argument("base", nargs="?", default="origin/main")
    base = git("merge-base", args.parse_args().base, "HEAD").decode().strip()
    failed = False
    for old, new in changes(base):
        if new.is_symlink() or not new.is_file():
            continue
        with new.open("rb") as stream:
            if not grammar(new, stream.read(8000)):
                continue
            stream.seek(0)
            current = list(comments(new, stream.read()))
        if not current:
            continue
        previous = Counter()
        if old:
            source = git("show", f"{base}:{old.as_posix()}")
            previous.update(raw for _, raw in comments(old, source))
        for line, raw in current:
            if previous[raw]:
                previous[raw] -= 1
            else:
                print(f"{new}:{line}: new code comment")
                failed = True
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
