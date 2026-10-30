#!/usr/bin/env python3
"""FiveM native lookup: the Lua function name FiveM really exposes, hash, args, docs, and where the
alloc8or native db disagrees.

Sources (cached in tools/natives-cache, refreshed when older than 14 days or with --update):
  natives.lua       https://static.cfx.re/natives/natives.lua            GTA natives as FiveM defines them
                                                                          (names, aliases, args; the Lua runtime
                                                                          is generated from this)
  natives_cfx.json  https://runtime.fivem.net/doc/natives_cfx.json       CFX natives (statebags, handling,
                                                                          server natives...) with apiset
  alloc8or.json     alloc8or/gta5-nativedb-data natives.json             research names, cross check only

Usage:
  python native.py cargobob                 name / Lua name / alias contains "cargobob"
  python native.py 0x9A665550F8DA349B       by hash (GTA 64-bit or CFX 32-bit)
  python native.py SetVehicleGravityAmount  by Lua name
  python native.py "magnet strength" --doc  every word must appear in name or docs
  python native.py gravity --cfx            CFX natives only (--gta: GTA only)
  python native.py --update                 refresh the cache
Options: --limit N (default 25), --full (whole doc text)
Source: FiveM codegen ext/natives/codegen_out_lua.lua printFunctionName (aliases get their own function).
"""
import json
import os
import re
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "natives-cache")
SOURCES = {
    "natives.lua": "https://static.cfx.re/natives/natives.lua",
    "natives_cfx.json": "https://runtime.fivem.net/doc/natives_cfx.json",
    "alloc8or.json": "https://raw.githubusercontent.com/alloc8or/gta5-nativedb-data/master/natives.json",
}
MAX_AGE = 14 * 24 * 3600


def lua_name(name):
    """FiveM codegen printFunctionName."""
    s = name.lower().replace("0x", "n_0x")
    s = re.sub(r"_([a-z])", lambda m: m.group(1).upper(), s)
    m = re.search(r"[A-Za-z]", s)
    if m:
        s = s[:m.start()] + s[m.start()].upper() + s[m.start() + 1:]
    return s


def fetch(force=False):
    os.makedirs(CACHE, exist_ok=True)
    for file, url in SOURCES.items():
        path = os.path.join(CACHE, file)
        if not force and os.path.exists(path) and time.time() - os.path.getmtime(path) < MAX_AGE:
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "aicore-native-lookup"})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            with open(path, "wb") as f:
                f.write(data)
            print("[cache] updated %s" % file, file=sys.stderr)
        except Exception as e:  # keep the old copy when offline
            if not os.path.exists(path):
                sys.exit("could not download %s: %s" % (url, e))
            print("[cache] %s not refreshed (%s), using the old copy" % (file, e), file=sys.stderr)


def parse_fivem_lua(path):
    text = open(path, encoding="utf-8", errors="replace").read()
    out = []
    for block in re.split(r'\n(?=native ")', text):
        m = re.match(r'native "([^"]+)"', block)
        if not m:
            continue
        h = re.search(r'\n\s*hash "(0x[0-9A-Fa-f]+)"', block)
        ns = re.search(r'\n\s*ns "([^"]+)"', block)
        ret = re.search(r'\n\s*returns "([^"]+)"', block)
        api = re.search(r'\n\s*apiset "([^"]+)"', block)
        args = []
        a = re.search(r"arguments \{(.*?)\n\t\}", block, re.S)
        if a:
            args = ["%s %s" % (t, n) for t, n in re.findall(r'\n\s*(\w+) "([^"]+)"', a.group(1))]
        aliases = re.findall(r'\n\s*alias "([^"]+)"', block)
        doc = re.search(r"doc \[\[!?(.*?)\]\]", block, re.S)
        doc = re.sub(r"</?summary>|```\w*", "", doc.group(1)).strip() if doc else ""
        out.append({
            "name": m.group(1), "hash": h.group(1).upper().replace("0X", "0x") if h else "", "ns": ns.group(1) if ns else "",
            "args": args, "ret": ret.group(1) if ret else "void", "aliases": [x for x in aliases if not x.lower().startswith("0x") or x.upper() != (h.group(1).upper() if h else "")],
            "doc": doc, "apiset": api.group(1) if api else "client", "kind": "GTA",
        })
    return out


def parse_cfx(path):
    data = json.load(open(path, encoding="utf-8"))
    out = []
    for ns, fns in data.items():
        for h, n in fns.items():
            out.append({
                "name": n["name"], "hash": h, "ns": ns,
                "args": ["%s %s" % (p["type"], p["name"]) for p in n.get("params", [])],
                "ret": n.get("results", "void"), "aliases": [], "doc": (n.get("description") or "").strip(),
                "apiset": n.get("apiset", "client"), "kind": "CFX",
            })
    return out


def parse_alloc8or(path):
    data = json.load(open(path, encoding="utf-8"))
    by_hash = {}
    for fns in data.values():
        for h, n in fns.items():
            by_hash[h.upper().replace("0X", "0x")] = {
                "name": n["name"], "args": ["%s %s" % (p["type"], p["name"]) for p in n.get("params", [])],
                "old": n.get("old_names") or [],
            }
    return by_hash


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def main():
    argv = sys.argv[1:]
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    if "--update" in argv:
        fetch(True)
        argv = [a for a in argv if a != "--update"]
        if not argv:
            return
    else:
        fetch(False)
    limit = 25
    if "--limit" in argv:
        i = argv.index("--limit")
        limit = int(argv[i + 1])
        del argv[i:i + 2]
    full = "--full" in argv
    use_doc = "--doc" in argv
    only_cfx = "--cfx" in argv
    only_gta = "--gta" in argv
    words = " ".join(a for a in argv if not a.startswith("--")).split()
    if not words:
        print(__doc__)
        return
    query = " ".join(words)

    natives = []
    if not only_cfx:
        natives += parse_fivem_lua(os.path.join(CACHE, "natives.lua"))
    if not only_gta:
        natives += parse_cfx(os.path.join(CACHE, "natives_cfx.json"))
    a8 = parse_alloc8or(os.path.join(CACHE, "alloc8or.json"))

    hits = []
    if re.fullmatch(r"0x[0-9a-fA-F]+", query):
        q = int(query, 16)
        hits = [n for n in natives if n["hash"] and int(n["hash"], 16) == q]
    else:
        qn = norm(query)
        terms = [norm(w) for w in words]
        for n in natives:
            names = [n["name"]] + n["aliases"]
            keys = [norm(x) for x in names] + [norm(lua_name(x)) for x in names]
            if any(k == qn for k in keys):
                hits.insert(0, n)  # exact first
            elif use_doc:
                hay = " ".join(keys) + " " + norm(n["doc"])
                if all(t in hay for t in terms):
                    hits.append(n)
            elif all(any(t in k for k in keys) for t in terms):
                hits.append(n)

    if not hits:
        print("no native for %r (try --doc, or a shorter word)" % query)
        return
    print("%d match(es)%s\n" % (len(hits), "" if len(hits) <= limit else ", first %d shown (--limit)" % limit))
    for n in hits[:limit]:
        lua = []
        for x in [n["name"]] + n["aliases"]:
            if lua_name(x) not in lua:
                lua.append(lua_name(x))
        where = n["kind"] if n["kind"] == n["ns"] else "%s %s" % (n["kind"], n["ns"])
        print("%s  (%s, %s)" % (lua[0], where, n["apiset"]))
        print("  name   %s   hash %s" % (n["name"], n["hash"]))
        if len(lua) > 1:
            print("  also   %s" % ", ".join(lua[1:]))
        print("  args   (%s) -> %s" % (", ".join(n["args"]), n["ret"]))
        print("  call   %s(...)   or   Citizen.InvokeNative(%s, ...)" % (lua[0], n["hash"]))
        other = a8.get(n["hash"]) if n["kind"] == "GTA" else None
        if other and other["name"].lstrip("_") != n["name"].lstrip("_") and other["name"] not in n["aliases"]:
            print("  !! alloc8or calls it %s (%s); names disagree, decide by the argument types and test in game"
                  % (other["name"], ", ".join(other["args"])))
        elif other and [x.split(" ")[0] for x in other["args"]] != [x.split(" ")[0] for x in n["args"]] and other["args"]:
            print("  !! alloc8or args: (%s)" % ", ".join(other["args"]))
        if n["doc"]:
            doc = re.sub(r"\s+", " ", n["doc"])
            print("  doc    %s" % (doc if full else doc[:400] + ("..." if len(doc) > 400 else "")))
        print()


if __name__ == "__main__":
    main()
