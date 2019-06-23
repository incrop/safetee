class Heading extends React.Component {
  render() {
    return (
      <>
        <tr>
          <th className="rules__select"></th>
          <th colSpan={this.props.attrNames.length + 3}>{this.props.title}</th>
        </tr>
        <tr>
          <th key="selected" className="rules__select"></th>
          <th key="id">id</th>
          <th key="value">Value</th>
          {this.props.attrNames.map(attrName => (
          <th key={"attr_" + attrName}>{attrName}</th>
          ))}
          <th key="conflicting"></th>
        </tr>
      </>
    )
  }
}

class Rule extends React.Component {
  isAttrSelected(attrName) {
    return this.props.selected && this.props.selectedAttr === attrName
  }

  render() {
    return (
      <tr {... this.props.onSelectRule ? {onClick: e => this.props.onSelectRule()} : {}}>
        <td key="selected" className="rules__select">{this.props.selected ? "⇨" : " "}</td>
        <td key="id">{this.props.id}</td>
        <td key="value"
            className={"rules__cell" + (this.isAttrSelected(true) ? " rules__cell_selected" : "")}
            onClick={e => this.props.onSelectAttr(true)}>
          {this.props.value}
        </td>
        {this.props.attrNames.map(attrName => (
        <td key={"attr_" + attrName}
            className={"rules__cell" + (this.isAttrSelected(attrName) ? " rules__cell_selected" : "")}
            onClick={e => this.props.onSelectAttr(attrName)}>
          {this.props.attrs[attrName]}
        </td>
        ))}
        <td key="conflicting">{this.props.conflicting ? "*" : " "}</td>
      </tr>
    )
  }
}

class Editor extends React.Component {
  updateAttributeValue(idx, newValue) {
    this.attrValues[idx] = newValue
    this.toggleStateCallback()
  }
  updateInvert(invert) {
    this.invert = invert;
    this.toggleStateCallback()
  }
  toggleStateCallback() {
    this.props.onChange(lib.encodeAttributeValue({invert: this.invert, values: this.attrValues}))
  }
  render() {
    const rule = this.props.rule
    const attrName = this.props.attrName
    const attrs = (rule && attrName)
      ? (attrName === true ? {values: [rule.value]} : lib.parseAttributeValue(rule.attrs[attrName]))
      : {values: [""]}
    this.attrValues = attrs.values
    this.invert = attrs.invert
    if (attrName !== true && this.attrValues[this.attrValues.length - 1] !== "") {
      this.attrValues.push("")
    }
    return (
      <div className="editor">
        <label>
          <input type="checkbox"
                 disabled={!rule || !attrName || attrName === true}
                 checked={this.invert || ""}
                 onChange={e => this.updateInvert(e.target.checked)}/>
          not
        </label>
        {this.attrValues.map((attrValue, idx) => (
        <input key={idx}
               type="text"
               className="editor__input"
               disabled={!rule || !attrName}
               value={attrValue}
               onChange={e => this.updateAttributeValue(idx, e.target.value)}/>
        ))}
      </div>
    )
  }
}

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.stateFromProps(props)
  }

  componentWillReceiveProps(props) {
    this.setState(this.stateFromProps(props))
  }

  stateFromProps(props) {
    let nextId = 1
    const attrNames = {}
    const rules = {}
    props.rules.forEach(rule => {
      const id = nextId++;
      rules[id] = {
        id: id,
        value: rule.value,
        attrs: rule.attrs,
      }
      Object.keys(rule.attrs)
            .forEach(attr => attrNames[attr] = true)
    })
    return {
      rules: rules,
      attrNames: Object.keys(attrNames),
      selectedRule: null,
      selectedAttr: null,
    }
  }

  findConflictingRules(ruleId) {
    if (ruleId === 0) {
      return []
    }
    return lib.findConflicting(ruleId, Object.values(this.state.rules))
  }

  renderRule(rule, mainPane) {
    let extraAttrs = mainPane
      ? {
        onSelectRule: () => this.setState({selectedRule: rule}),
        conflicting: this.findConflictingRules(rule.id).length > 0,
        onSelectAttr: attrName => this.setState({selectedAttr: attrName}),
      }
      : {onSelectAttr: () => {}}

    return (
      <Rule key={rule.id} id={rule.id}
            selected={this.state.selectedRule && this.state.selectedRule.id === rule.id}
            selectedAttr={this.state.selectedAttr}
            value={rule.value} attrNames={this.state.attrNames} attrs={rule.attrs}
            {... extraAttrs}/>
    )
  }

  updateSelectedRule(newValue) {
    const selectedRule = this.state.selectedRule
    const newRule = {...selectedRule}
    if (this.state.selectedAttr === true) {
      newRule.value = newValue
    } else {
      const newAttrs = {...selectedRule.attrs}
      if (newValue) {
        newAttrs[this.state.selectedAttr] = newValue
      } else {
        delete newAttrs[this.state.selectedAttr]
      }
      newRule.attrs = newAttrs
    }
    const newRules = {...this.state.rules}
    newRules[selectedRule.id] = newRule
    this.setState({selectedRule: newRule, rules: newRules})
  }

  render() {
    let conflictingWithSelected = this.state.selectedRule
      ? this.findConflictingRules(this.state.selectedRule.id)
      : []
    return (
      <div className="app">
        <Editor rule={this.state.selectedRule}
                attrName={this.state.selectedAttr}
                onChange={newValue => this.updateSelectedRule(newValue)}/>
        <table className="rules">
          <thead>
          <Heading title="All Rules" attrNames={this.state.attrNames}/>
          </thead>
          <tbody>
            {Object.values(this.state.rules).map(rule => this.renderRule(rule, true))}
            {conflictingWithSelected.length > 0 &&
              <Heading title="Conflicting with selected" attrNames={this.state.attrNames}/>}
            {conflictingWithSelected.map(rule => this.renderRule(rule, false))}
          </tbody>
        </table>
      </div>
    )
  }
}

class Root extends React.Component {
  constructor(props) {
    super(props)
    this.state = {rules: []}
  }

  importFromGUI(csv) {
    const newRules = []
    const lines = csv.split("\n").map(line => line.trim().split("\t"))
    const header = lines.shift();
    lines.forEach(line => {
      const value = line[0];
      const attrs = {};
      for (let i = 1; i < header.length; i++) {
        if (line[i]) {
          attrs[header[i]] = line[i]
        }
      }
      newRules.push({value: value, attrs: attrs})
    })
    this.setState({rules: newRules})
  }

  render() {
    return (
      <div>
        <App rules={this.state.rules}/>
        <div contentEditable={true}
             suppressContentEditableWarning={true}
             onPaste={e => {
               e.preventDefault()
               e.stopPropagation()
               const clipboardData = e.clipboardData || window.clipboardData
               this.importFromGUI(clipboardData.getData("Text"))
             }}>
          Paste
        </div>
      </div>
    )
  }
}
