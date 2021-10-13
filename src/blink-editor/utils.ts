import { IState, TNodeType } from './index'

/**
 * 生成唯一字符串
 * @param {String} prefix 修饰前缀
 * @returns {String}
*/
export const genKey = (prefix: string = 'key') : string => {
  return `${prefix}_${Math.random().toString()}`
}

/**
 * 生成节点
 * @param {String} type 节点类型
 * @param {String} content 节点内容
 * @returns {IState}
*/
export const genNode = (type: TNodeType, content: string): IState => {
  return {
    key: genKey(),
    type,
    content
  }
}