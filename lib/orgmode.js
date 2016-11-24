'use strict';

/**
 * The `Orgmode` implementation for Node.js which contains:
 *
 *  1. A parser for orgmode based on the monadic LL(infinity) parser combinator
 *     library [jneen/parsimmon](https://github.com/jneen/parsimmon).
 *  2. A simple search engine for outlines.
 *
 * @module Orgmode
 * @example
 * ```js
 * const Orgmode = require('orgmode');
 * const document = new Orgmode('./path/to/your/document.org');
 *
 * document.overview   // this is a getter for your document's OVERVIEW option
 * document.findByLevel(1) // you will get both level 1 outlines in array
 * ```
 *
 */


const OrgmodeParser = require('./parser');
const fs = require('fs');

/**
 * OutlineArrayList is a class to support some methods with
 * some `OutlineNode` instances.
 *
 * @class OutlinesArrayList
 */
class OutlinesArrayList {

  /**
   * @constructor
   */
  constructor(collection) {
    this._outlines = collection || [];
  }

  /**
   * @property {Number} length - the length of this Array
   */
  get length() {
    return this._outlines.length;
  }

  /**
   * @property {Array} tables - list the all tables
   */
  get tables() {
    return this._outlines.reduce((collection, outline) => {
      const tables = outline.tables;
      if (tables.length > 0) {
        return collection.concat(tables);
      } else {
        return collection;
      }
    }, []);
  }

  /**
   * @description get the element by specified `n`
   * @method item
   * @param {Number} n - the item index
   */
  getItem(n) {
    return this._outlines[n];
  }

  /**
   * get the first element
   * @method first
   */
  first() {
    return this.getItem(0);
  }

  /**
   * get the last element
   * @method last
   */
  last() {
    return this.getItem(this.length - 1);
  }

  /**
   * @method findByLevel
   * @param {Number} level
   * @return {Array} return the outlines
   */
  findByLevel(level) {
    return this._outlines.filter(
      (outline) => outline.level === level
    );
  }


  /**
   * @method findByTags
   * @param {String} tags
   * @return {Array} return the outlines
   */
  findByTags(tags) {
    return this._outlines.filter(
      (outline) => {
        return outline.tags.some((tag) => tag === tags);
      }
    );
  }

  /**
   * @method findByTitle
   * @param {String} title
   * @return {Array} return the outlines
   */
  findByTitle(title) {
    return this._outlines.filter(
      (outline) => outline.title === title
    );
  }

  /**
   * set outlines, this can be called by those class wants extend
   * @method setOutlines
   * @param {Array} collection - the collection to set
   */
  setOutlines(collection) {
    this._outlines = collection;
  }
}

/**
 * For every outline node
 * @class OutlineNode
 */
class OutlineNode {

  /**
   * @constructor
   */
  constructor(data, options) {
    Object.defineProperties(this, {
      _data: {
        get: () => data
      },
      _list: {
        get: () => options.list || []
      },
      _index: {
        get: () => options.index
      }
    });
    this.title = this._data.heading.title;
    this.level = this._data.heading.level;
    this.tags = this._data.heading.tags;
  }

  /**
   * @property {Array} tables - the tables
   */
  get tables() {
    return this._data.section.children.filter(
      (child) => child.type === 'table'
    );
  }

  /**
   * @property {Array} children - get the children
   */
  get children() {
    let children = [];
    let curr = this.next();
    while (curr && curr.level > this.level) {
      children.push(curr);
      curr = curr.next();
    }
    return new OutlinesArrayList(children);
  }

  /**
   * Get the next node
   * @method next
   * @return {OutlineNode|Null} returns null if index is over range.
   */
  next() {
    if (this._index >= this._list.length - 1) {
      return null;
    } else {
      return this._list[this._index + 1]._node;
    }
  }

  /**
   * Get the prev node
   * @method prev
   * @return {OutlineNode|Null} returns null if index is over range.
   */
  prev() {
    if (this._index < 0) {
      return null;
    } else {
      return this._list[this._index - 1]._node;
    }
  }

  /**
   * @method toJSON
   * @return {Object} return as a plain JSON to return
   */
  toJSON() {
    return this._data;
  }
}


/**
 * The main script of `Orgmode`
 * @class Orgmode
 * @extends OutlinesArrayList
 */
class Orgmode extends OutlinesArrayList {

  /**
   * @constructor
   */
  constructor(pathname) {
    let ast = new OrgmodeParser(
      fs.readFileSync(pathname, 'utf8')
    ).parse();
    // Here calling the super constructor of `OutlinesArrayList` will
    // add a _outlines there from the inner `_buildOutlines` method
    super([]);

    // define the invisible properties
    Object.defineProperties(this, {
      _pathname: {
        get: () => pathname,
      },
      _ast: {
        get: () => ast,
      },
    });

    // call setOutlines of super to build this._outlines
    this.setOutlines(this._buildOutlines());
  }

  /**
   * @method _buildOutlines
   * @private
   */
  _buildOutlines() {
    return this._ast.outlines.map((data, index) => {
      const node = new OutlineNode(data, {
        index,
        list: this._ast.outlines,
      });
      Object.defineProperty(this._ast.outlines[index], '_node', {
        get: () => node
      });
      return node;
    });
  }

  /**
   * @property {Object} overview - the overview of this document
   */
  get overview() {
    return this._ast.options.reduce((map, item) => {
      map[item.name.toLowerCase()] = item.value;
      return map;
    }, {});
  }

  ///**
  // * @property {Object} overview - the overview of this document
  // */
  //get blocks() {
  //  return this._ast.options.reduce((map, item) => {
  //    map[item.name.toLowerCase()] = item.value;
  //    return map;
  //  }, {});
  //}

  /**
   * @method findBlockByName(name)
   * @param {Number} name
   * @return {Block} return the blocks
   */
  findBlockByName(name) {
    return this._ast.blocks.filter(
      (block) => block.name === name
    );
  }
}

module.exports = Orgmode;
