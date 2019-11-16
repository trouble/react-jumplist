import React, { Component } from 'react';
import PropTypes from 'prop-types';
import animateScrollTo from 'animated-scroll-to';
import defaultClassPrefix from '../defaultClassPrefix';
import withJumplistContext from '../withJumplistContext';

class Jumplist extends Component {
  constructor(props) {
    super(props);
    this.state = {
      targetNodes: {},
    };
  }

  componentDidMount() {
    this.queryTargetNodes();
  }

  componentDidUpdate(prevProps) {
    const {
      scrollInfo,
      scrollInfo: {
        count: scrollCount,
      },
      windowInfo,
    } = this.props;

    const verticalScrollChange = prevProps.scrollInfo.x !== scrollInfo.x;
    const horizontalScrollChange = prevProps.scrollInfo.y !== scrollInfo.y;
    const windowWidthChange = prevProps.windowInfo.width !== windowInfo.width;
    const windowHeightChange = prevProps.windowInfo.height !== windowInfo.height;

    if (windowWidthChange || windowHeightChange) {
      this.queryTargetNodes();
    }

    if (verticalScrollChange || horizontalScrollChange) {
      if (scrollCount > 1) {
        this.trackTargetNodes();
      } else {
        this.queryTargetNodes();
      }
    }
  }

  scrollTo = (targetID) => {
    const { hScrollOffset, vScrollOffset } = this.props;
    const { targetNodes } = this.state;
    const node = targetNodes[targetID];

    if (node) {
      const { offsetLeft, offsetTop } = node;
      const xCoord = offsetLeft + (hScrollOffset || 0);
      const yCoord = offsetTop + (vScrollOffset || 0);
      animateScrollTo([xCoord, yCoord]);
    }
  }

  isNodeInFrame = (nodeRect) => {
    const { threshold } = this.props;
    const { top, right, bottom, left } = nodeRect;

    const boundaries = {
      top: threshold || 0,
      right: threshold ? window.innerWidth - threshold : window.innerWidth,
      bottom: threshold ? window.innerHeight - threshold : window.innerHeight,
      left: threshold || 0,
    };

    return (top <= boundaries.bottom && bottom >= boundaries.top) && (right >= boundaries.left && left <= boundaries.right);
  }

  // true positions
  queryTargetNodes = () => {
    const { list } = this.props;
    const targetNodes = {};

    if (list && list.length > 0) {
      list.forEach((item) => {
        const { targetId } = item;
        const node = document.getElementById(targetId);
        if (node) {
          const DOMRect = node.getBoundingClientRect(); // clientRect because its relative to the vieport
          const { top, right, bottom, left } = DOMRect;
          const nodeRect = { top, right, bottom, left }; // create a new, plain object from the DOMRect object
          const isInFrame = this.isNodeInFrame(nodeRect);
          targetNodes[targetId] = {
            nodeRect,
            isInFrame,
            offsetLeft: left + window.scrollX,
            offsetTop: top + window.scrollY,
          };
        }
      });
    }

    this.setState({ targetNodes });
  }

  // synthetic (calculated) positions
  trackTargetNodes = () => {
    const {
      scrollInfo: {
        xDifference,
        yDifference,
      },
    } = this.props;

    const { targetNodes } = this.state;
    const modifiedNodes = {};
    const targetNodeIDs = Object.keys(targetNodes);

    if (targetNodeIDs && targetNodeIDs.length > 0) {
      targetNodeIDs.forEach((targetNodeID) => {
        const targetNode = targetNodes[targetNodeID];
        const { nodeRect } = targetNode;
        const newNodeRect = {
          top: nodeRect.top - yDifference,
          right: nodeRect.right - xDifference,
          bottom: nodeRect.bottom - yDifference,
          left: nodeRect.left - xDifference,
        };
        modifiedNodes[targetNodeID] = {
          ...targetNode, // keep original offsetLeft and offsetTop
          nodeRect: newNodeRect,
          isInFrame: this.isNodeInFrame(newNodeRect),
        };
      });
    }
    this.setState({ targetNodes: modifiedNodes });
  }

  render() {
    const {
      classPrefix,
      className,
      list,
      htmlElement: HtmlElement,
    } = this.props;

    const { targetNodes } = this.state;

    const baseClass = `${classPrefix || defaultClassPrefix}__jumplist`;

    const classes = [
      baseClass,
      className,
    ].filter(Boolean).join(' ');

    if (list && list.length > 0) {
      return (
        <HtmlElement className={classes}>
          {list.map((item, index) => {
            const { clickableNode, targetId } = item;
            const targetNode = targetNodes[targetId];
            const itemBaseClass = `${baseClass}__item`;

            const itemClasses = [
              itemBaseClass,
              targetNode && targetNode.isInFrame && `${itemBaseClass}--is-in-frame`,
            ].filter(Boolean).join(' ');

            return (
              React.cloneElement(
                clickableNode,
                {
                  key: index,
                  className: itemClasses,
                  onClick: () => this.scrollTo(targetId),
                },
              )
            );
          })}
        </HtmlElement>
      );
    }

    return null;
  }
}

Jumplist.defaultProps = {
  classPrefix: '',
  className: '',
  list: [],
  threshold: undefined,
  hScrollOffset: 0,
  vScrollOffset: 0,
  htmlElement: 'ul',
};

Jumplist.propTypes = {
  classPrefix: PropTypes.string,
  className: PropTypes.string,
  scrollInfo: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
    xDifference: PropTypes.number,
    yDifference: PropTypes.number,
    xDirection: PropTypes.oneOf([
      '',
      'left',
      'right',
    ]),
    yDirection: PropTypes.oneOf([
      '',
      'up',
      'down',
    ]),
    count: PropTypes.number,
  }).isRequired,
  windowInfo: PropTypes.shape({
    width: PropTypes.number,
    height: PropTypes.number,
  }).isRequired,
  list: PropTypes.arrayOf(
    PropTypes.shape({
      clickableNode: PropTypes.node.isRequired,
      targetId: PropTypes.string.isRequired,
    }),
  ),
  threshold: PropTypes.number,
  hScrollOffset: PropTypes.number,
  vScrollOffset: PropTypes.number,
  htmlElement: PropTypes.oneOf([
    'article',
    'aside',
    'div',
    'footer',
    'header',
    'main',
    'nav',
    'section',
    'span',
    'ul',
    'li',
  ]),
};

export default withJumplistContext(Jumplist);
