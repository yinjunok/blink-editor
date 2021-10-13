import { genKey, genNode } from './utils'
import './style.css'

export type TNodeType = 'p' | 'h1' | 'h2' | 'h3' 

export interface IState {
  key: string
  type: TNodeType
  content: string
}

class BlinkEditor {
  private root: HTMLDivElement
  private editPanel!: HTMLDivElement
  private toolbar!: HTMLDivElement
  private isFocus: boolean = false
  private isCompositionInput: boolean = false
  private selection: Selection | null = null
  private state: IState[] = [genNode('p', 'abcdefghijklmnop')]

  constructor(rootId: string) {
    const root = document.getElementById(rootId)
    if (root === null) {
      throw new Error('没找到根元素')
    }
    this.root = root as HTMLDivElement
    this.init()
    this.render()
  }

  private init() {
    this.createEditPanel()
    this.createToolbar()
    this.root.appendChild(this.toolbar)
    this.root.appendChild(this.editPanel)
  }

  private createToolbar() {
    this.toolbar = document.createElement('div')
    this.toolbar.classList.add('bl-toolbar')
    this.toolbar.innerHTML = `
      <button data-format='p'>p</button>
      <button data-format='h1'>h1</button>
      <button data-format='h2'>h2</button>
    `
    this.toolbar.addEventListener('mousedown', this.toolbarAction, false)
  }

  private toolbarAction = (e: MouseEvent) => {
    if (this.selection) {
      const format = (e.target as HTMLButtonElement).dataset.format as TNodeType
      const node = this.findBlock(this.selection)
      if (node) {
        node.node.type = format
        this.render()
      }
    }
  }

  private onFocus = () => {
    this.isFocus = true
    document.addEventListener('selectionchange', this.onSelectionChange)
  }

  /**
   * 拦截输入, 并根据输入类型操作状态  
   * 输入类型: https://rawgit.com/w3c/input-events/v1/index.html#interface-InputEvent-Attributes   
  */
  private onBeforeInput = (e: InputEvent) => {
    const { selection } = this
    if (!selection) {
      return
    }

    e.preventDefault()
    switch (e.inputType) {
      case 'insertText':
        this.insertText(e.data as string)
        break;
      case 'insertParagraph':
        this.insertParagraph()
        break;
      case 'deleteContentBackward':
        this.deleteContentBackward()
        break;
      case 'deleteContentForward':
        this.deleteContentForward()
        break;
      default:
        break;
    }
  }

  /**
   * 查询正在编辑的段落
   * @param {Selection} selection 输入时选区
  */
  private findBlock(selection: Selection): { index: number, node: IState } | null {
    const { focusNode } = selection
    if (focusNode?.nodeType === Node.ELEMENT_NODE) {
      const i = this.state.findIndex(s => s.key === (focusNode as HTMLElement).dataset.key)
      return {
        index: i,
        node: this.state[i]
      }
    }

    if (focusNode?.nodeType === Node.TEXT_NODE) {
      const i = this.state.findIndex(s => s.key === (focusNode.parentNode as HTMLElement).dataset.key)
      return {
        index: i,
        node: this.state[i]
      }
    }

    return null
  }

  /**
   * 按退格删除文本
  */
  private deleteContentBackward = () => {
    const selection = this.selection!
    const range = selection.getRangeAt(0)
    const endOffset = range.endOffset
    const startOffset = range.startOffset
    if (startOffset === 0) {
      return
    }

    const block = this.findBlock(selection)
    const element = selection.focusNode

    if (block && element) {
      const { node } = block

      if (startOffset !== endOffset) {
        const startStr = node.content.substring(0, startOffset)
        const endStr = node.content.substring(endOffset)
        node.content = startStr + endStr
        element.textContent = node.content
        range.setStart(element as Node, startOffset)
        range.setEnd(element as Node, startOffset)
      } else {
        const start = endOffset - 1
        const startStr = node.content.substring(0, start)
        const endStr = node.content.substring(endOffset)
        node.content = startStr + endStr
        element.textContent = node.content
        range.setStart(element as Node, start)
        range.setEnd(element as Node, start)
      }
    }
  }

  /**
   * 按 delete 删除
  */
  private deleteContentForward = () => {
    const selection = this.selection!
    const range = selection.getRangeAt(0)
    const endOffset = range.endOffset
    const startOffset = range.startOffset

    const block = this.findBlock(selection)
    const element = selection.focusNode

    if (block && element) {
      const { node } = block
      if (node.content.length <= endOffset) {
        return
      }
      if (startOffset !== endOffset) {
        const startStr = node.content.substring(0, startOffset)
        const endStr = node.content.substring(endOffset)
        node.content = startStr + endStr
        element.textContent = node.content
        range.setStart(element as Node, startOffset)
        range.setEnd(element as Node, startOffset)
      } else {
        const end = endOffset + 1
        const startStr = node.content.substring(0, startOffset)
        const endStr = node.content.substring(end)
        node.content = startStr + endStr
        element.textContent = node.content
        range.setStart(element as Node, endOffset)
        range.setEnd(element as Node, endOffset)
      }
    }    
  }

  /**
   * 插入文本
   * @param {String} text 插入的文本
  */
  private insertText(text: string) {
    const selection = this.selection!
    const range = selection.getRangeAt(0)
    const endOffset = range.endOffset
    const startOffset = range.startOffset

    const modified = selection.focusNode
    const block = this.findBlock(selection)
    if (block) {
      const { node } = block
      const startStr = node.content.substring(0, startOffset)
      const endStr = node.content.substring(endOffset)
      node.content = startStr + text + endStr
      if (modified) {
        if (modified.nodeType === Node.ELEMENT_NODE) {
          const textNode = document.createTextNode(node.content)
          modified.appendChild(textNode)
          range.setStart(textNode, endOffset + 1)
          range.setEnd(textNode, endOffset + 1)
        }
        if (modified.nodeType === Node.TEXT_NODE) {
          modified.textContent = node.content
          range.setStart(modified, startOffset + 1)
          range.setEnd(modified, startOffset + 1)
        }
      }
    }
  }

  /**
   * 插入段落
  */
  private insertParagraph() {
    const selection = this.selection!
    const block = this.findBlock(selection)
    if (block) {
      const { node, index } = block
      const range = selection.getRangeAt(0)
      const startStr = node.content.substring(0, range.endOffset)
      const endStr = node.content.substring(range.endOffset)
      const p = genNode('p', endStr)
      this.state.splice(
        index,
        1,
        { type: 'p', key: genKey(), content: startStr, },
        p,
      )
      this.render()
    
      const element = document.querySelector(`[data-key="${p.key}"]`) as HTMLParagraphElement
      if (element.firstChild) {
        range.setStart(element.firstChild as Text, 0)
        range.setEnd(element.firstChild as Text, 0)
      } else {
        range.setStart(element, 0)
        range.setEnd(element, 0)
      }
    }
  }

  private onBlur = () => {
    this.isFocus = false
    this.selection = null
    document.removeEventListener('selectionchange', this.onSelectionChange)
  }

  /**
   * 间接文本输入事件, 比如输入中文  
   * 文档: https://developer.mozilla.org/zh-CN/docs/Web/API/CompositionEvent
  */
  private onCompositionStart = (e: CompositionEvent) => {
    this.isCompositionInput = true
    console.log('onCompositionStart', e)
  }

  private onCompositionUpdate = (e: CompositionEvent) => {
    console.log('onCompositionUpdate', e)
  }

  private onCompositionEnd = (e: CompositionEvent) => {
    console.log('onCompositionEnd', e)
    this.isCompositionInput = false
  }

  /**
   * 选区变动回调
  */
  private onSelectionChange = () => {
    this.selection = window.getSelection()
  }

  /**
   * 创建编辑区
  */
  private createEditPanel() {
    this.editPanel = document.createElement('div')
    this.editPanel.classList.add('bl-editor')
    this.editPanel.setAttribute('contenteditable', 'true')

    this.editPanel.addEventListener('focus', this.onFocus)
    this.editPanel.addEventListener('blur', this.onBlur)
    this.editPanel.addEventListener('beforeinput', this.onBeforeInput)
    this.editPanel.addEventListener('compositionstart', this.onCompositionStart)
    this.editPanel.addEventListener('compositionupdate', this.onCompositionUpdate)
    this.editPanel.addEventListener('compositionend', this.onCompositionEnd)
  }

  /**
   * 将状态渲染成 HTML 插入编辑器
  */
  private render() {
    const { state } = this
    let content: string = state.map(s => `<${s.type} data-key="${s.key}">${s.content}</${s.type}>`).join('')
    this.editPanel.innerHTML = content
  }
}

export default BlinkEditor
