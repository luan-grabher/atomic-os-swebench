import importlib.util,sys
def load(p):
    s=importlib.util.spec_from_file_location("m",p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
m=load(sys.argv[1])
a=m.EventBuffer("a"); b=m.EventBuffer("b")
a.push("x")
assert "x" not in b.push("y"), "FAIL: state shared across instances (mutable class attr not fixed)"
assert "x" in a.push("z"), "FAIL: instance lost its own state"
print("PASS: per-instance state isolated")
