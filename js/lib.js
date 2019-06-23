const SOME_OTHER = {some: "other"}

const lib = {
  findConflicting: (ruleId, rules) => {
    let parsedRefRule = parseAttrs(rules.find(rule => rule.id === ruleId))
    return rules.filter(rule => rule.id !== ruleId)
                .filter(rule => attrsConflicting(parsedRefRule, parseAttrs(rule)))

    function attrsConflicting(attrs1, attrs2) {
      if (!Object.keys({...attrs1, ...attrs2}).every(name => matchValueExists(attrs1[name], attrs2[name]))) {
        return false
      }
      const uniqueInAttrs1 = Object.keys(attrs1).some(name => !attrs2.hasOwnProperty(name))
      const uniqueInAttrs2 = Object.keys(attrs2).some(name => !attrs1.hasOwnProperty(name))
      return uniqueInAttrs1 && uniqueInAttrs2
    }

    function matchValueExists(attr1, attr2) {
      if (!attr1 || !attr2) {
        return true
      }
      const allUniqs = [... new Set([...uniqueValues(attr1), ...uniqueValues(attr2)])]
      const allowed1 = new Set(allowedValues(attr1, allUniqs))
      return allowedValues(attr2, allUniqs).some(val => allowed1.has(val))
    }

    function uniqueValues(attr) {
      if (["", "*", "+", "<null>"].indexOf(attr.values[0]) > -1) {
        return []
      }
      return attr.values
    }

    function allowedValues(attr, allUniqs) {
      const uniqs = new Set(attr.values)
      if (attr.invert) {
        return ["", SOME_OTHER, ...allUniqs.filter(val => !uniqs.has(val))]
      }
      switch (attr.values[0]) {
        case "": return ["", SOME_OTHER, ...allUniqs]
        case "*": return ["", SOME_OTHER, ...allUniqs]
        case "+": return [SOME_OTHER, ...allUniqs]
        case "<null>": return [""]
        default: return attr.values
      }
    }

    function parseAttrs(rule) {
      let parsed = {}
      for (let name in rule.attrs) {
        parsed[name] = lib.parseAttributeValue(rule.attrs[name])
      }
      return parsed
    }
  },
  parseAttributeValue: (input) => {
    if (!input) {
      return {
        invert: false,
        values: [],
      }
    } else if (input.startsWith("!/")) {
      return {
        invert: true,
        values: input.substring(2).split("|"),
      }
    } else if (input.startsWith("/")) {
      return {
        invert: false,
        values: input.substring(1).split("|"),
      }
    } else {
      return {
        invert: false,
        values: [input],
      }
    }
  },
  encodeAttributeValue: (attr) => {
    const values = attr.values.map(s => s.trim()).filter(s => s.length > 0)
    if (values.length === 0) {
      return "";
    }
    if (values.length === 1 && !attr.invert)  {
      return values[0];
    }
    return (attr.invert ? "!/" : "/") + values.join("|")
  },
}
