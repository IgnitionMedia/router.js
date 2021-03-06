QUnit.config.testTimeout = 100;

var router, url, handlers;

module("The router", {
  setup: function() {
    router = new Router();

    router.map(function(match) {
      match("/posts", function(match) {
        match("/:id").to("showPost");
        match("/admin/:id").to("admin", function(match) {
          match("/posts/:post_id").to("adminPost");
        });
        match("/").to("postIndex", function(match) {
          match("/all").to("showAllPosts");

          // TODO: Support canonical: true
          match("/").to("showAllPosts");
          match("/popular").to("showPopularPosts");
          match("/filter/:filter_id").to("showFilteredPosts");
        });
      });
    });

    router.getHandler = function(name) {
      return handlers[name];
    }
  }
});

test("Mapping adds named routes to the end", function() {
  url = router.recognizer.generate("showPost", { id: 1 });
  equal(url, "/posts/1");

  url = router.recognizer.generate("showAllPosts");
  equal(url, "/posts");
});

asyncTest("Handling a URL triggers deserialize on the handlerand passes the result into the setup method", function() {
  expect(3);

  var post = { post: true };
  var posts = { index: true };

  var showPostHandler = {
    deserialize: function(params) {
      deepEqual(params, { id: "1" });
      return post;
    },

    setup: function(object) {
      strictEqual(object, post);
      equal(showPostHandler.context, post);
      start();
    }
  };

  var postIndexHandler = {};

  handlers = {
    showPost: showPostHandler,
    postIndex: postIndexHandler
  };

  router.handleURL("/posts/1");
});

asyncTest("Handling a nested URL triggers each handler", function() {
  expect(31);

  var posts = [];
  var allPosts = { all: true };
  var popularPosts = { popular: true };
  var amazingPosts = { filtered: "amazing" };
  var sadPosts = { filtered: "sad" };

  var counter = 0;

  var postIndexHandler = {
    deserialize: function(params) {
      // this will always get called, since it's at the root
      // of all of the routes tested here
      deepEqual(params, {}, "params should be empty in postIndexHandler#deserialize");
      return posts;
    },

    setup: function(object) {
      if (counter === 0) {
        equal(postIndexHandler.context, posts, "postIndexHandler context should be set up in postIndexHandler#setup");
        strictEqual(object, posts, "The object passed in to postIndexHandler#setup should be posts");
      } else {
        ok(false, "Should not get here");
      }
    }
  };

  var showAllPostsHandler = {
    deserialize: function(params) {
      if (counter > 0 && counter < 4) {
        equal(postIndexHandler.context, posts, "postIndexHandler context should be set up in showAllPostsHandler#deserialize");
      }

      if (counter < 4) {
        deepEqual(params, {}, "params should be empty in showAllPostsHandler#deserialize");
        return allPosts;
      } else {
        ok(false, "Should not get here");
      }
    },

    setup: function(object) {
      if (counter === 0) {
        equal(postIndexHandler.context, posts, "postIndexHandler context should be set up in showAllPostsHandler#setup");
        equal(showAllPostsHandler.context, allPosts, "showAllPostsHandler context should be set up in showAllPostsHandler#setup");
        strictEqual(object, allPosts, "The object passed in should be allPosts in showAllPostsHandler#setup");
      } else {
        ok(false, "Should not get here");
      }
    }
  };

  var showPopularPostsHandler = {
    deserialize: function(params) {
      if (counter < 3) {
        ok(false, "Should not get here");
      } else if (counter === 3) {
        equal(postIndexHandler.context, posts, "postIndexHandler context should be set up in showPopularPostsHandler#deserialize");
        deepEqual(params, {}, "params should be empty in showPopularPostsHandler#serialize");
        return popularPosts;
      } else {
        ok(false, "Should not get here");
      }
    },

    setup: function(object) {
      if (counter === 3) {
        equal(postIndexHandler.context, posts, "postIndexHandler context should be set up in showPopularPostsHandler#setup");
        equal(showPopularPostsHandler.context, popularPosts, "showPopularPostsHandler context should be set up in showPopularPostsHandler#setup");
        strictEqual(object, popularPosts, "The object passed to showPopularPostsHandler#setup should be popular posts");
      } else {
        ok(false, "Should not get here");
      }
    }
  };

  var showFilteredPostsHandler = {
    deserialize: function(params) {
      if (counter < 4) {
        ok(false, "Should not get here");
      } else if (counter === 4) {
        equal(postIndexHandler.context, posts, "postIndexHandler context should be set up in showFilteredPostsHandler#deserialize");
        deepEqual(params, { filter_id: 'amazing' }, "params should be { filter_id: 'amazing' } in showFilteredPostsHandler#deserialize");
        return amazingPosts;
      } else if (counter === 5) {
        equal(postIndexHandler.context, posts, "postIndexHandler context should be posts in showFilteredPostsHandler#deserialize");
        deepEqual(params, { filter_id: 'sad' }, "params should be { filter_id: 'sad' } in showFilteredPostsHandler#deserialize");
        return sadPosts;
      } else {
        ok(false, "Should not get here");
      }
    },

    setup: function(object) {
      if (counter === 4) {
        equal(postIndexHandler.context, posts);
        equal(showFilteredPostsHandler.context, amazingPosts);
        strictEqual(object, amazingPosts);
      } else if (counter === 5) {
        equal(postIndexHandler.context, posts);
        equal(showFilteredPostsHandler.context, sadPosts);
        strictEqual(object, sadPosts);
        start();
      } else {
        ok(false, "Should not get here");
      }
    }
  };


  handlers = {
    postIndex: postIndexHandler,
    showAllPosts: showAllPostsHandler,
    showPopularPosts: showPopularPostsHandler,
    showFilteredPosts: showFilteredPostsHandler
  };

  router.handleURL("/posts");

  counter++;

  router.handleURL("/posts/all");

  counter++;

  router.handleURL("/posts");

  counter++;

  router.handleURL("/posts/popular");

  counter++;

  router.handleURL("/posts/filter/amazing");

  counter++;

  router.handleURL("/posts/filter/sad");
});

test("it can handle direct transitions to named routes", function() {
  var posts = [];
  var allPosts = { all: true };
  var popularPosts = { popular: true };
  var amazingPosts = { filter: "amazing" };
  var sadPosts = { filter: "sad" };

  postIndexHandler = {
    deserialize: function(params) {
      return allPosts;
    },

    serialize: function(object, params) {
      return {};
    },

    setup: function(object) {
      
    }
  };

  showAllPostsHandler = {
    deserialize: function(params) {
      deepEqual(params, {});
      return allPosts;
    },

    serialize: function(object, params) {
      return {};
    },

    setup: function(object) {
      strictEqual(object, allPosts);
    }
  };

  showPopularPostsHandler = {
    deserialize: function(params) {
      deepEqual(params, {});
      return popularPosts;
    },

    serialize: function(object) {
      return {};
    },

    setup: function(object) {
      strictEqual(object, popularPosts, "showPopularPosts#setup should be called with the deserialized value");
    }
  };

  showFilteredPostsHandler = {
    deserialize: function(params) {
      if (params.filter_id === "amazing") {
        return amazingPosts;
      } else if (params.filter_id === "sad") {
        return sadPosts;
      }
    },

    serialize: function(object, params) {
      deepEqual(params, ['filter_id']);
      return { filter_id: object.filter };
    },

    setup: function(object) {
      if (counter === 2) {
        strictEqual(object, amazingPosts);
      } else if (counter === 3) {
        strictEqual(object, sadPosts);
      }
    }
  }

  handlers = {
    postIndex: postIndexHandler,
    showAllPosts: showAllPostsHandler,
    showPopularPosts: showPopularPostsHandler,
    showFilteredPosts: showFilteredPostsHandler
  };

  router.updateURL = function(url) {
    expected = {
      0: "/posts",
      1: "/posts/popular",
      2: "/posts/filter/amazing",
      3: "/posts/filter/sad",
      4: "/posts"
    }

    equal(url, expected[counter]);
  };


  router.handleURL("/posts");

  var counter = 0;

  router.transitionTo("showAllPosts");

  counter++;

  router.transitionTo("showPopularPosts");

  counter++;

  router.transitionTo("showFilteredPosts", amazingPosts);

  counter++;

  router.transitionTo("showFilteredPosts", sadPosts);

  counter++;

  router.transitionTo("showAllPosts");
});

asyncTest("if deserialize returns a promise, it enters a loading state", function() {
  var post = { post: true };

  var events = [];

  var showPostHandler = {
    deserialize: function(params) {
      deepEqual(events, []);
      events.push("deserialize");

      var promise = new RSVP.Promise();

      setTimeout(function() {
        promise.resolve(post);
      }, 1);

      return promise;
    },

    setup: function(object) {
      deepEqual(events, ["deserialize", "loading", "loaded"]);
      events.push("setup");

      strictEqual(object, post);
      start();
    }
  }

  var loadingHandler = {
    setup: function() {
      deepEqual(events, ["deserialize"]);
      events.push("loading");
      ok(true, "Loading was called");
    },

    exit: function() {
      deepEqual(events, ["deserialize", "loading"]);
      events.push("loaded");
      ok(true, "Loading was exited");
    }
  }

  handlers = {
    showPost: showPostHandler,
    loading: loadingHandler
  }

  router.handleURL("/posts/1");
});

asyncTest("if deserialize returns a promise that is later rejected, it enters a failure state", function() {
  var post = { post: true };
  var err = { error: true };

  var events = [];

  var showPostHandler = {
    deserialize: function(params) {
      deepEqual(events, []);
      events.push("deserialize");

      var promise = new RSVP.Promise();

      setTimeout(function() {
        promise.reject(err);
      }, 1);

      return promise;
    },

    setup: function(object) {
      deepEqual(events, ["deserialize", "loading", "loaded"]);
      events.push("setup");

      strictEqual(object, post);
    }
  }

  var loadingHandler = {
    setup: function() {
      deepEqual(events, ["deserialize"]);
      events.push("loading");
      ok(true, "Loading was called");
    },

    exit: function() {
      deepEqual(events, ["deserialize", "loading"]);
      events.push("loaded");
      ok(true, "Loading was exited");
    }
  }

  var failureHandler = {
    setup: function(error) {
      start();
      strictEqual(error, err);
    }
  }

  handlers = {
    showPost: showPostHandler,
    loading: loadingHandler,
    failure: failureHandler
  }

  router.handleURL("/posts/1");
});

asyncTest("Moving to a new top-level route triggers exit callbacks", function() {
  expect(4);

  var allPosts = { posts: "all" };
  var postsStore = { 1: { id: 1 }, 2: { id: 2 } };
  var currentId, currentURL;

  var showAllPostsHandler = {
    deserialize: function(params) {
      return allPosts;
    },

    setup: function(posts) {
      equal(posts, allPosts, "The correct context was passed into showAllPostsHandler#setup");

      setTimeout(function() {
        currentURL = "/posts/1";
        currentId = 1;
        router.transitionTo('showPost', postsStore[1]);
      }, 0);
    },

    exit: function() {
      ok(true, "Should get here");
    }
  };

  var showPostHandler = {
    deserialize: function(params) {
      if (postsStore[params.id]) { return postsStore[params.id]; }
      return postsStore[params.id] = { post: params.id };
    },

    serialize: function(post) {
      return { id: post.id };
    },

    setup: function(post) {
      equal(post.id, currentId, "The post id is " + currentId);
      start();
    }
  };

  var postIndexHandler = {};

  handlers = {
    postIndex: postIndexHandler,
    showAllPosts: showAllPostsHandler,
    showPost: showPostHandler
  };

  router.updateURL = function(url) {
    equal(url, currentURL, "The url is " + currentURL + " as expected");
  };

  router.handleURL("/posts");
});

asyncTest("Moving to a sibling route only triggers exit callbacks on the current route (when transitioned internally)", function() {
  expect(8);

  var allPosts = { posts: "all" };
  var postsStore = { 1: { id: 1 }, 2: { id: 2 } };
  var currentId, currentURL;

  var showAllPostsHandler = {
    deserialize: function(params) {
      return allPosts;
    },

    setup: function(posts) {
      equal(posts, allPosts, "The correct context was passed into showAllPostsHandler#setup");

      setTimeout(function() {
        currentURL = "/posts/filter/favorite";
        router.transitionTo('showFilteredPosts', {
          id: 'favorite'
        });
      }, 0);
    },

    enter: function() {
      ok(true, "The sibling handler should be entered");
    },

    exit: function() {
      ok(true, "The sibling handler should be exited");
    }
  };

  var filters = {};

  var showFilteredPostsHandler = {
    enter: function() {
      ok(true, "The new handler was entered");
    },

    exit: function() {
      ok(false, "The new handler should not be exited");
    },

    deserialize: function(params) {
      var id = params.filter_id;
      if (!filters[id]) {
        filters[id] = { id: id }
      }

      return filters[id];
    },

    serialize: function(filter) {
      equal(filter.id, "favorite", "The filter should be 'favorite'");
      return { filter_id: filter.id };
    },

    setup: function(filter) {
      equal(filter.id, "favorite", "showFilteredPostsHandler#setup was called with the favorite filter");
      start();
    }
  };

  var postIndexHandler = {
    enter: function() {
      ok(true, "The outer handler was entered only once");
    },

    exit: function() {
      ok(false, "The outer handler was not exited");
    }
  };

  handlers = {
    postIndex: postIndexHandler,
    showAllPosts: showAllPostsHandler,
    showFilteredPosts: showFilteredPostsHandler
  };

  router.updateURL = function(url) {
    equal(url, currentURL, "The url is " + currentURL + " as expected");
  };

  router.handleURL("/posts");
});

asyncTest("Moving to a sibling route only triggers exit callbacks on the current route (when transitioned via a URL change)", function() {
  expect(7);

  var allPosts = { posts: "all" };
  var postsStore = { 1: { id: 1 }, 2: { id: 2 } };
  var currentId, currentURL;

  var showAllPostsHandler = {
    deserialize: function(params) {
      return allPosts;
    },

    setup: function(posts) {
      equal(posts, allPosts, "The correct context was passed into showAllPostsHandler#setup");

      setTimeout(function() {
        currentURL = "/posts/filter/favorite";
        router.handleURL(currentURL);
      }, 0);
    },

    enter: function() {
      ok(true, "The sibling handler should be entered");
    },

    exit: function() {
      ok(true, "The sibling handler should be exited");
    }
  };

  var filters = {};

  var showFilteredPostsHandler = {
    enter: function() {
      ok(true, "The new handler was entered");
    },

    exit: function() {
      ok(false, "The new handler should not be exited");
    },

    deserialize: function(params) {
      equal(params.filter_id, "favorite", "The filter should be 'favorite'");

      var id = params.filter_id;
      if (!filters[id]) {
        filters[id] = { id: id }
      }

      return filters[id];
    },

    serialize: function(filter) {
      return { filter_id: filter.id };
    },

    setup: function(filter) {
      equal(filter.id, "favorite", "showFilteredPostsHandler#setup was called with the favorite filter");
      start();
    }
  };

  var postIndexHandler = {
    enter: function() {
      ok(true, "The outer handler was entered only once");
    },

    exit: function() {
      ok(false, "The outer handler was not exited");
    }
  };

  handlers = {
    postIndex: postIndexHandler,
    showAllPosts: showAllPostsHandler,
    showFilteredPosts: showFilteredPostsHandler
  };

  router.updateURL = function(url) {
    equal(url, currentURL, "The url is " + currentURL + " as expected");
  };

  router.handleURL("/posts");
});

asyncTest("events can be targeted at the current handler", function() {
  var showPostHandler = {
    enter: function() {
      ok(true, "The show post handler was entered");
    },

    events: {
      expand: function(handler) {
        equal(handler, showPostHandler, "The handler is passed into events");
        start();
      }
    }
  };

  handlers = {
    showPost: showPostHandler
  };

  router.handleURL("/posts/1");
  router.trigger("expand");
});

asyncTest("events can be targeted at a parent handler", function() {
  expect(3);

  var postIndexHandler = {
    enter: function() {
      ok(true, "The post index handler was entered");
    },

    events: {
      expand: function(handler) {
        equal(handler, postIndexHandler, "The handler is passed into events");
        start();
      }
    }
  };

  var showAllPostsHandler = {
    enter: function() {
      ok(true, "The show all posts handler was entered");
    }
  }

  handlers = {
    postIndex: postIndexHandler,
    showAllPosts: showAllPostsHandler
  };

  router.handleURL("/posts");
  router.trigger("expand");
});

asyncTest("events only fire on the closest handler", function() {
  expect(4);

  var postIndexHandler = {
    enter: function() {
      ok(true, "The post index handler was entered");
    },

    events: {
      expand: function(handler) {
        ok(false, "Should not get to the parent handler");
      }
    }
  };

  var showAllPostsHandler = {
    enter: function() {
      ok(true, "The show all posts handler was entered");
    },

    events: {
      expand: function(handler, passedContext) {
        equal(context, passedContext, "A context is passed along");
        equal(handler, showAllPostsHandler, "The handler is passed into events");
        start();
      }
    }
  }

  handlers = {
    postIndex: postIndexHandler,
    showAllPosts: showAllPostsHandler
  };

  var context = {};
  router.handleURL("/posts");
  router.trigger("expand", context);
});

test("paramsForHandler returns params", function() {
  var post = { id: 12 };

  var showPostHandler = {
    serialize: function(object) {
      return { id: object.id };
    },

    deserialize: function(params) {
      equal(params.id, 12, "The parameters are correct");
      return post;
    }
  };

  handlers = { showPost: showPostHandler };

  deepEqual(router.paramsForHandler('showPost', post), { id: 12 }, "The correct parameters were retrieved");
});

test("paramsForHandler uses the current context if you are already in a handler with a context that is not changing", function() {
  var admin = { id: 47 },
      adminPost = { id: 74 };

  var adminHandler = {
    serialize: function(object) {
      equal(object.id, 47, "The object passed to serialize is correct");
      return { id: 47 };
    },

    deserialize: function(params) {
      equal(params.id, 47, "The object passed to serialize is correct");
      return admin;
    }
  };

  var adminPostHandler = {
    serialize: function(object) {
      return { post_id: object.id };
    },

    deserialize: function(params) {
      equal(params.id, 74, "The object passed to serialize is correct");
      return adminPost;
    }
  };

  handlers = {
    admin: adminHandler,
    adminPost: adminPostHandler
  };

  var url;

  router.updateURL = function(passedURL) {
    url = passedURL;
  };

  router.transitionTo('adminPost', admin, adminPost);
  equal(url, '/posts/admin/47/posts/74', 'precond - the URL is correct');

  var params = router.paramsForHandler('adminPost', { id: 75 });
  deepEqual(params, { id: 47, post_id: 75 });

  var url = router.generate('adminPost', { id: 75 });
  deepEqual(url, '/posts/admin/47/posts/75');
});

test("when leaving a handler, the context is nulled out", function() {
  var admin = { id: 47 },
      adminPost = { id: 74 };

  var adminHandler = {
    serialize: function(object) {
      equal(object.id, 47, "The object passed to serialize is correct");
      return { id: 47 };
    },

    deserialize: function(params) {
      equal(params.id, 47, "The object passed to serialize is correct");
      return admin;
    }
  };

  var adminPostHandler = {
    serialize: function(object) {
      return { post_id: object.id };
    },

    deserialize: function(params) {
      equal(params.id, 74, "The object passed to serialize is correct");
      return adminPost;
    }
  };

  var showPostHandler = {

  };

  handlers = {
    admin: adminHandler,
    adminPost: adminPostHandler,
    showPost: showPostHandler
  };

  var url;

  router.updateURL = function(passedURL) {
    url = passedURL;
  };

  router.transitionTo('adminPost', admin, adminPost);
  equal(url, '/posts/admin/47/posts/74', 'precond - the URL is correct');

  router.transitionTo('showPost');
  ok(!adminHandler.hasOwnProperty('context'), "The inactive handler's context was nulled out");
  ok(!adminPostHandler.hasOwnProperty('context'), "The inactive handler's context was nulled out");
});

test("transitionTo uses the current context if you are already in a handler with a context that is not changing", function() {
  var admin = { id: 47 },
      adminPost = { id: 74 };

  var adminHandler = {
    serialize: function(object) {
      equal(object.id, 47, "The object passed to serialize is correct");
      return { id: 47 };
    },

    deserialize: function(params) {
      equal(params.id, 47, "The object passed to serialize is correct");
      return admin;
    }
  };

  var adminPostHandler = {
    serialize: function(object) {
      return { post_id: object.id };
    },

    deserialize: function(params) {
      equal(params.id, 74, "The object passed to serialize is correct");
      return adminPost;
    }
  };

  handlers = {
    admin: adminHandler,
    adminPost: adminPostHandler
  };

  var url;

  router.updateURL = function(passedURL) {
    url = passedURL;
  };

  router.transitionTo('adminPost', admin, adminPost);
  equal(url, '/posts/admin/47/posts/74', 'precond - the URL is correct');

  router.transitionTo('adminPost', { id: 75 });
  equal(url, '/posts/admin/47/posts/75', "the current context was used");
});

