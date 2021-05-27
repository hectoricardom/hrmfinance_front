import React, { Component } from 'react';

class WithScroll extends Component {
  constructor() {
    super();

    // Initial scroll position
    this.state = {
      scrollPosition: null,
    };

    // Bind handlers
    this.handleInterval = this.handleInterval.bind(this);
    this.handleRequestAnimationFrame = this.handleRequestAnimationFrame.bind(this);
  }

  componentWillMount() {
    // 50 times per second, change to your needs
    const INTERVAL = 50;
    this.intervalID = setInterval(this.handleInterval, INTERVAL);
  }

  componentWillUnmount() {
    // Remove and reset interval/animationFrame
    //console.log("componentWillUnmount WithScroll")
    clearInterval(this.intervalID);
    cancelAnimationFrame(this.requestID);
    this.requestID = null;
    this.intervalID = null;
  }

  getWindowScrollTop() {
    // Get scroll position, with IE fallback
    return window.pageYOffset || document.documentElement.scrollTop;
  }

  handleInterval() {
    // Interval is only used to throttle animation frame
    cancelAnimationFrame(this.requestID);
    this.requestID = requestAnimationFrame(this.handleRequestAnimationFrame);
  }

  handleRequestAnimationFrame() {
    const { scrollPosition } = this.state;
    const newScrollPosition = this.getWindowScrollTop();

    // Update the state only when scroll position is changed
    if (newScrollPosition !== scrollPosition) {
      if (typeof this.props.scrollhandler === 'function') {      
        this.props.scrollhandler(newScrollPosition);
      } 
      this.setState({
        scrollPosition: newScrollPosition,
      });
    }
  }

  render() {  
    return (
      <>
      </>
    );
  }
};

export default WithScroll;