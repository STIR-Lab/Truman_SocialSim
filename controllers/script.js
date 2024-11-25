const _ = require("lodash");
const Actor = require("../models/Actor.js");
const Script = require("../models/Script.js");
const User = require("../models/User");
const Notification = require("../models/Notification");
const NudgeAction = require("../models/NudgeAction");

function shuffle(array) {
	let currentIndex = array.length;
	let temporaryValue;
	let randomIndex;

	// While there remain elements to shuffle...
	while (currentIndex !== 0) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

/**
 * GET /
 * List of Script posts for Feed
 */
exports.getScript = (req, res, next) => {
	// req.user.createdAt
	const time_now = Date.now();
	const time_diff = time_now - req.user.createdAt;
	// var today = moment();
	// var tomorrow = moment(today).add(1, 'days');
	const two_days = 86400000 * 2; // two days in milliseconds
	const time_limit = time_diff - two_days;

	const user_ip =
		req.headers["x-forwarded-for"] || req.connection.remoteAddress;
	const userAgent = req.headers["user-agent"];

	let bully_post;
	const bully_count = 0;

	let scriptFilter;

	console.log("$#$#$#$#$#$#$START GET SCRIPT$#$#$$#$#$#$#$#$#$#$#$#$#");
	console.log(`time_diff  is now ${time_diff}`);
	console.log(`time_limit  is now ${time_limit}`);


	User.findById(req.user.id)
		.populate({
			path: "posts.reply",
			model: "Script",
			populate: {
				path: "actor",
				model: "Actor",
			},
		})
		.populate({
			path: "posts.actorAuthor",
			model: "Actor",
		})
		.populate({
			path: "posts.comments.actor",
			model: "Actor",
		})
		.exec((err, user) => {
			// filter the script based on experimental group
			scriptFilter = user.group;

			// User is no longer active - study is over
			if (!user.active) {
				req.logout();
				req.flash("errors", {
					msg: "Account is no longer active. Study is over",
				});
				res.redirect("/login");
			}

			user.logUser(time_now, userAgent, user_ip);
			user.logPage(Date.now(), "script");

			// what day in the study are we in???
			const one_day = 86400000; // 303,695,677 259,200,000
			let current_day;

			// day one
			if (time_diff <= one_day) {
				current_day = 0;
				// add one to current day user.study_days[current_day]
				user.study_days[0] = user.study_days[0] + 1;
				user.study_days.set(0, user.study_days[0] + 1);
				// console.log("!!!DAY1 is now "+ user.study_days[0]);
			}
			// day two
			else if (time_diff > one_day && time_diff <= one_day * 2) {
				current_day = 1;
				user.study_days.set(1, user.study_days[1] + 1);
				// console.log("!!!DAY2 is now "+ user.study_days[1]);
			}
			// day 3
			else if (time_diff > one_day * 2) {
				current_day = 2;
				user.study_days.set(2, user.study_days[2] + 1);
				// console.log("!!!DAY3 is now "+ user.study_days[2]);
			} else {
				current_day = -1;
				console.log("@@@@@@@@@@_NO_DAY");
			}

			// Get the newsfeed
			Script.find()
				.where("experiment_group")
				.equals(scriptFilter)
				.where("time")
				.lte(time_diff)
				.gte(time_limit)
				.sort("-time")
				.populate("actor")
				.populate({
					path: "comments.actor",
					populate: {
						path: "actor",
						model: "Actor",
					},
				})
				.exec((err, script_feed) => {
					if (err) {
						return next(err);
					}
					// Successful, so render

					// update script feed to see if reading and posts has already happened
					const finalfeed = [];

					let user_posts = [];

					// Look up Notifications??? And do this as well?

					user_posts = user.getPostInPeriod(time_limit, time_diff);

					user_posts.sort((a, b) => b.relativeTime - a.relativeTime);

					while (script_feed.length || user_posts.length) {
						// console.log(typeof user_posts[0] === 'undefined');
						// console.log(user_posts[0].relativeTime);
						// console.log(feed[0].time)
						if (typeof script_feed[0] === "undefined") {
							console.log("Script_Feed is empty, push user_posts");
							finalfeed.push(user_posts[0]);
							user_posts.splice(0, 1);
						} else if (
							!(typeof user_posts[0] === "undefined") &&
							script_feed[0].time < user_posts[0].relativeTime
						) {
							console.log("Push user_posts");
							finalfeed.push(user_posts[0]);
							user_posts.splice(0, 1);
						} else {
							// console.log("ELSE PUSH FEED");
							var feedIndex = _.findIndex(
								user.feedAction,
								(o) => o.post == script_feed[0].id
							);

							if (feedIndex != -1) {
								console.log("WE HAVE AN ACTION!!!!!");

								// check to see if there are comments - if so remove ones that are not in time yet.
								// Do all comment work here for feed
								// if (Array.isArray(script_feed[0].comments) && script_feed[0].comments.length) {
								if (
									Array.isArray(user.feedAction[feedIndex].comments) &&
									user.feedAction[feedIndex].comments
								) {
									// console.log("WE HAVE COMMENTS!!!!!");
									// iterate over all comments in post - add likes, flag, etc
									for (
										var i = 0;
										i < user.feedAction[feedIndex].comments.length;
										i++
									) {
										// i is now user.feedAction[feedIndex].comments index

										// is this action of new user made comment we have to add???
										if (user.feedAction[feedIndex].comments[i].new_comment) {
											// comment.new_comment
											// console.log("adding User Made Comment into feed: "+user.feedAction[feedIndex].comments[i].new_comment_id);
											// console.log(JSON.stringify(user.feedAction[feedIndex].comments[i]))
											// script_feed[0].comments.push(user.feedAction[feedIndex].comments[i]);

											const cat = new Object();
											cat.body =
												user.feedAction[feedIndex].comments[i].comment_body;
											cat.new_comment =
												user.feedAction[feedIndex].comments[i].new_comment;
											cat.time = user.feedAction[feedIndex].comments[i].time;
											cat.commentID =
												user.feedAction[feedIndex].comments[i].new_comment_id;
											cat.likes = 0;

											script_feed[0].comments.push(cat);
											// console.log("Already have COMMENT ARRAY");
										} else {
											// Do something
											// var commentIndex = _.findIndex(user.feedAction[feedIndex].comments, function(o) { return o.comment == script_feed[0].comments[i].id; });
											const commentIndex = _.findIndex(
												script_feed[0].comments,
												(o) =>
													o.id == user.feedAction[feedIndex].comments[i].comment
											);
											// If user action on Comment in Script Post
											if (commentIndex != -1) {
												// console.log("WE HAVE AN ACTIONS ON COMMENTS!!!!!");
												// Action is a like (user liked this comment in this post)
												if (user.feedAction[feedIndex].comments[i].liked) {
													script_feed[0].comments[commentIndex].liked = true;
													script_feed[0].comments[commentIndex].likes++;
													// console.log("Post %o has been LIKED", script_feed[0].id);
												}

												// Action is a FLAG (user Flaged this comment in this post)
												if (user.feedAction[feedIndex].comments[i].flagged) {
													console.log(
														"Comment %o has been LIKED",
														user.feedAction[feedIndex].comments[i].id
													);
													script_feed[0].comments.splice(commentIndex, 1);
												}
											}
										} // end of ELSE
									} // end of for loop
								} // end of IF Comments

								if (user.feedAction[feedIndex].readTime[0]) {
									script_feed[0].read = true;
									script_feed[0].state = "read";
									// console.log("Post: %o has been READ", script_feed[0].id);
								} else {
									script_feed[0].read = false;
									// script_feed[0].state = 'read';
								}

								if (user.feedAction[feedIndex].liked) {
									script_feed[0].like = true;
									script_feed[0].likes++;
									// console.log("Post %o has been LIKED", script_feed[0].id);
								}

								if (user.feedAction[feedIndex].replyTime[0]) {
									script_feed[0].reply = true;
									// console.log("Post %o has been REPLIED", script_feed[0].id);
								}

								// If this post has been flagged - remove it from FEED array (script_feed)
								if (user.feedAction[feedIndex].flagTime[0]) {
									script_feed.splice(0, 1);
									// console.log("Post %o has been FLAGGED", script_feed[0].id);
								}

								// post is from blocked user - so remove  it from feed
								else if (user.blocked.includes(script_feed[0].actor.username)) {
									script_feed.splice(0, 1);
								} else {
									// console.log("Post is NOT FLAGGED, ADDED TO FINAL FEED");
									finalfeed.push(script_feed[0]);
									script_feed.splice(0, 1);
								}
							} // end of IF we found Feed_action
							else {
								// console.log("NO FEED ACTION SO, ADDED TO FINAL FEED");
								if (user.blocked.includes(script_feed[0].actor.username)) {
									script_feed.splice(0, 1);
								} else {
									finalfeed.push(script_feed[0]);
									script_feed.splice(0, 1);
								}
							}
						} // else in while loop
					} // while loop

					// shuffle up the list
					// finalfeed = shuffle(finalfeed);

					user.save((err) => {
						if (err) {
							console.log(`ERROR IN USER SAVE IS ${err}`);
							return next(err);
						}
						// req.flash('success', { msg: 'Profile information has been updated.' });
					});

					console.log(`Script Size is now: ${finalfeed.length}`);
					res.render("script", { script: finalfeed });
				}); // end of Script.find()
		}); // end of User.findByID
}; // end of .getScript

exports.getScriptPost = (req, res) => {
	Script.findOne({ _id: req.params.id }, (err, post) => {
		console.log(post);
		res.render("script_post", { post });
	});
};

/**
 * GET /
 * List of Script posts for Feed
 * Made for testing
 */
exports.getScriptFeed = (req, res, next) => {
	console.log("$#$#$#$#$#$#$START GET FEED$#$#$$#$#$#$#$#$#$#$#$#$#");
	// console.log("time_diff  is now "+time_diff);
	// console.log("time_limit  is now "+time_limit);
	// study2_n0_p0
	console.log("$#$#$#$#$#$#$START GET FEED$#$#$$#$#$#$#$#$#$#$#$#$#");
	let scriptFilter = "";

	const profileFilter = "";
	// study3_n20, study3_n80

	scriptFilter = req.params.caseId;

	// req.params.modId
	console.log(`#############SCRIPT FILTER IS NOW ${scriptFilter}`);

	// {

	Script.find()
		// change this if you want to test other parts
		// .where(scriptFilter).equals("yes")
		// .where('time').lte(0)
		.sort("-time")
		.populate("actor")
		.populate({
			path: "comments.actor",
			populate: {
				path: "actor",
				model: "Actor",
			},
		})
		.exec((err, script_feed) => {
			if (err) {
				return next(err);
			}
			// Successful, so render

			// update script feed to see if reading and posts has already happened
			let finalfeed = [];
			finalfeed = script_feed;

			// shuffle up the list
			// finalfeed = shuffle(finalfeed);

			console.log(`Script Size is now: ${finalfeed.length}`);
			res.render("feed", { script: finalfeed, namefilter: profileFilter });
		}); // end of Script.find()
}; // end of .getScript

/*
##############
NEW POST
#############
*/
exports.newPost = async (req, res) => {
	User.findById(req.user.id, async (err, user) => {
		if (err) {
			return next(err);
		}

		// var lastFive = user.id.substr(user.id.length - 5);
		// console.log(lastFive +" just called to create a new post");
		// console.log("OG file name is "+req.file.originalname);
		// console.log("Actual file name is "+req.file.filename);
		console.log("###########NEW POST###########");
		console.log(`Text Body of Post is ${req.body.body}`);

		const post = new Object();
		post.body = req.body.body;
		post.absTime = Date.now();
		post.relativeTime = post.absTime - user.createdAt;

		// if numPost/etc never existed yet, make it here - should never happen in new users
		if (!user.numPosts && user.numPosts < -1) {
			user.numPosts = -1;
			console.log(`numPost is ${user.numPosts}`);
		}

		if (!user.numReplies && user.numReplies < -1) {
			user.numReplies = -1;
			console.log(`numReplies is ${user.numReplies}`);
		}

		if (!user.numActorReplies && user.numActorReplies < -1) {
			user.numActorReplies = -1;
			console.log(`numActorReplies is ${user.numActorReplies}`);
		}
		// This is a new post - not comment or reply
		if (req.file) {
			console.log(`Text PICTURE of Post is ${req.file.filename}`);
			post.picture = req.file.filename;

			user.numPosts += 1;
			post.postID = user.numPosts;
			post.type = "user_post";
			post.comments = [];

			const actors = await Actor.find();

			// get random actor
			//const randomActor = actors[Math.floor(Math.random() * actors.length)];
			const randomActor = actors[1];
			//console.log(actors[0], actors[1], actors[2], actors[3], actors[4], actors[5]);
			console.log(randomActor);


			if (!user.hasSeenCommentNudge && user.numPosts < 30) {
				// setTimeout(async () => {
				console.log("This is the first user post, so we add a comment nudge");
				const commentNudge = new Object();

				commentNudge.body = "lol wth is this post? 😂";
				user.numActorReplies += 1;
				commentNudge.commentID = user.numActorReplies;
				commentNudge.actor = randomActor._id;
				commentNudge.class = "commentNudge";
				commentNudge.nudgeShown = "true";  // Modify this if Nudge is not supposed to be shown
				commentNudge.userAction = "null";
				commentNudge.time = post.relativeTime;
				// add to posts
				post.comments.push(commentNudge);
				user.hasSeenCommentNudge = true;
				console.log("Now user has seen comment nudge");
				// }, 5000);  
			}

			// Now we find any Actor Replies (Comments) that go along with it
			Notification.find()
				.where("userPost")
				.equals(post.postID)
				.where("notificationType")
				.equals("reply")
				.populate("actor")
				.exec((err, actor_replies) => {
					if (err) {
						return next(err);
					}
					// console.log("%^%^%^^%INSIDE NOTIFICATION&^&^&^&^&^&^&");
					if (actor_replies.length > 0) {
						// we have a actor reply that goes with this userPost
						// add them to the posts array

						// console.log("@@@@@@@We have Actor Comments to add: "+actor_replies.length);
						for (let i = 0, len = actor_replies.length; i < len; i++) {
							const tmp_actor_reply = new Object();

							// actual actor reply information
							tmp_actor_reply.body = actor_replies[i].replyBody;
							// tmp_actor_reply.actorReplyID = actor_replies[i].replyBody;
							// might need to change to above
							user.numActorReplies += 1;
							tmp_actor_reply.commentID = user.numActorReplies;
							tmp_actor_reply.actor = actor_replies[i].actor;

							tmp_actor_reply.time = post.relativeTime + actor_replies[i].time;

							// add to posts
							post.comments.push(tmp_actor_reply);
						}
					} // end of IF

					// console.log("numPost is now "+user.numPosts);
					user.posts.unshift(post);
					user.logPostStats(post.postID);
					console.log("CREATING NEW POST!!!");

					user.save(async (err) => {
						if (err) {
							return next(err);
						}
						// req.flash('success', { msg: 'Profile information has been updated.' });
						res.status(200).redirect("/");
					});
				}); // of of Notification
		} else {
			console.log(
				"#@#@#@#@#@#@#ERROR: Oh Snap, Made a Post but not reply or Pic"
			);
			req.flash("errors", {
				msg: "ERROR: Your post or reply did not get sent",
			});
			res.redirect("/");
		}
	});
};
// exports.newPost = async (req, res) => {
//     User.findById(req.user.id, async (err, user) => {
//         if (err) {
//             return next(err);
//         }

//         console.log("###########NEW POST###########");
//         console.log(`Text Body of Post is ${req.body.body}`);

//         const post = new Object();
//         post.body = req.body.body;
//         post.absTime = Date.now();
//         post.relativeTime = post.absTime - user.createdAt;

//         if (!user.numPosts && user.numPosts < -1) {
//             user.numPosts = -1;
//         }

//         if (!user.numReplies && user.numReplies < -1) {
//             user.numReplies = -1;
//         }

//         if (!user.numActorReplies && user.numActorReplies < -1) {
//             user.numActorReplies = -1;
//         }

//         if (req.file) {
//             console.log(`Text PICTURE of Post is ${req.file.filename}`);
//             post.picture = req.file.filename;

//             user.numPosts += 1;
//             post.postID = user.numPosts;
//             post.type = "user_post";
//             post.comments = [];

//             user.posts.unshift(post);
//             user.logPostStats(post.postID);

//             user.save(async (err) => {
//                 if (err) {
//                     return next(err);
//                 }

//                 res.status(200).redirect("/");

//                 const actors = await Actor.find();
//                 const randomActor = actors[Math.floor(Math.random() * actors.length)];
//                 console.log(randomActor);

// 				if (user.numPosts < 5) {
// 					console.log("First post. Comment Nudge should be added.")
// 					setTimeout(async () => {
// 						console.log("Adding a comment nudge after 5 seconds");
// 						const commentNudge = new Object();
// 						commentNudge.body = "This post is stupid";
// 						user.numActorReplies += 1;
// 						commentNudge.commentID = user.numActorReplies;
// 						commentNudge.actor = randomActor._id;
// 						commentNudge.class = "commentNudge";
// 						commentNudge.nudgeShown = "true";
// 						commentNudge.userAction = "null";
// 						commentNudge.time = Date.now() - user.createdAt;

// 						const updatedUser = await User.findById(req.user.id);
// 						const updatedPost = updatedUser.posts.find(p => p.postID === post.postID);
// 						if (updatedPost) {
// 							updatedPost.comments.push(commentNudge);
// 							updatedUser.save(err => {
// 								if (err) {
// 									console.error("Error saving the comment nudge:", err);
// 								} else {
// 									console.log("Comment nudge added successfully!");
// 								}
// 							});
// 						} else {
// 							console.error("Post not found; comment nudge not added.");
// 						}
// 					}, 5000);
// 				}

//             });

//             Notification.find()
//                 .where("userPost")
//                 .equals(post.postID)
//                 .where("notificationType")
//                 .equals("reply")
//                 .populate("actor")
//                 .exec((err, actor_replies) => {
//                     if (err) {
//                         return next(err);
//                     }
//                     if (actor_replies.length > 0) {
//                         for (let i = 0, len = actor_replies.length; i < len; i++) {
//                             const tmp_actor_reply = new Object();

//                             tmp_actor_reply.body = actor_replies[i].replyBody;
//                             user.numActorReplies += 1;
//                             tmp_actor_reply.commentID = user.numActorReplies;
//                             tmp_actor_reply.actor = actor_replies[i].actor;

//                             tmp_actor_reply.time = post.relativeTime + actor_replies[i].time;
//                             post.comments.push(tmp_actor_reply);
//                         }
//                     }
//                 });
//         } else {
//             console.log("#@#@#@#@#@#@#ERROR: Oh Snap, Made a Post but not reply or Pic");
//             req.flash("errors", {
//                 msg: "ERROR: Your post or reply did not get sent",
//             });
//             res.redirect("/");
//         }
//     });
// };




/**
 * POST /commentnudge/reaction
 * Update the comment nudge based upon the user action
 * Possible user actions: 'null', 'unhide', 'hide', 'block', 'blockAndReport'
 */
exports.postCommentNudgeReaction = async (req, res, next) => {
	console.log("Inside postCommentNudgeReaction");
	console.log(req.body);

	// find the user
	let user = await User.findById(req.user.id);
	if (!user) {
		console.log("ERROR: Could not find user in DB");
		console.log(req.body);
		return next(err);
	}

	if (req.body.postID == null || req.body.commentID == null) {
		console.log("postID/commentID is null")
		return;
	}
	// find correct post in the user object
	// console.log(user)
	// console.log(user.posts)
	let post = user.posts.find((o) => o._id == req.body.postID);
	let postIndex = user.posts.findIndex((o) => o._id == req.body.postID);
	// console.log(post);

	if (!post) {
		console.log("ERROR: Could not find post in user object");
		return next(err);
	}
	// find the right comment in the post
	let comment = post.comments.find((o) => o.commentID == req.body.commentID);
	let commentIndex = post.comments.findIndex(
		(o) => o.commentID == req.body.commentID
	);

	console.log("comment is ", comment);

	// check if nudge exists on the object
	if (comment.class == "commentNudge") {
		// then change the nudge useraction
		user.posts[postIndex].comments[commentIndex].userAction =
			req.body.userAction;
		user.numPosts = user.numPosts;
		console.log(user.posts[postIndex].comments[commentIndex].userAction);
	} else {
		// throw an error
		console.log("ERROR: Could not find nudge on comment");
	}

	await user.markModified("posts");
	const result = await User.updateOne(
		{ _id: req.user.id },
		{ $set: { posts: user.posts } });
	console.log("UPDATED USER");
	// print updated user action
	console.log(result);
	/*
	console.log(
		"UPDATED USER ACTION: " +
			result.posts[postIndex].comments[commentIndex].userAction
	);
	*/

	let actor = await Actor.findById(comment.actor);

	const nudgeAction = new NudgeAction({
		offender_username: actor.username,
		recipient_username: user.username,
		nudge_name: 'CommentNudge',
		nudge_action_name: req.body.userAction +
			"_CommentNudge",
		original_msg: comment
	})
	console.log("comment nudge Action");
	// print updated user action
	console.log(nudgeAction);
	nudgeAction.save(err => {
		if (err) {
			console.log(err);
		} else {
			console.log('Nudge action updated successfully.');
		}
	});
	res.status(200).redirect("/");
	/*
	User.updateOne(
		{ _id: req.user.id },
		{ $set: { posts: user.posts } },
		(err, result) => {
			if (err) {
				console.log("ERROR: Could not find nudge on comment");
				return next(err);
			} else {
				console.log("UPDATED USER");
				// console.log(result)
				console.log(
					"UPDATED USER ACTION: " +
						result.posts[postIndex].comments[commentIndex].userAction
				);
				res.status(200).redirect("/");
			}
		}
	);
	*/
	/*
	// save the user
	await user.save((err, updatedUser) => {
		if (err) {
			return next(err);
		}
		// req.flash('success', { msg: 'Profile information has been updated.' });
		console.log(
			"UPDATED USER ACTION: " +
				updatedUser.posts[postIndex].comments[commentIndex].userAction
		);
		console.log(
			"updated comment is:",
			updatedUser.posts[postIndex].comments[commentIndex]
		);
		console.log("SAVED USER");
		res.status(200).redirect("/");
	});
	*/
};

/**
 * POST /feed/
 * Update user's profie feed posts Actions.
 */
exports.postUpdateFeedAction = (req, res, next) => {
	User.findById(req.user.id, (err, user) => {
		// somehow user does not exist here
		if (err) {
			return next(err);
		}

		console.log("@@@@@@@@@@@ TOP postID is  ", req.body.postID);

		// find the object from the right post in feed
		let feedIndex = _.findIndex(
			user.feedAction,
			(o) => o.post == req.body.postID
		);

		console.log("@@@ USER index is  ", feedIndex);

		if (feedIndex == -1) {
			// Post does not exist yet in User DB, so we have to add it now
			console.log(
				"$$$$$Making new feedAction Object! at post ",
				req.body.postID
			);
			var cat = new Object();
			cat.post = req.body.postID;
			if (!req.body.start) {
				console.log(
					"!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!No start"
				);
			}
			cat.startTime = req.body.start || 0;
			cat.rereadTimes = 0;
			// add new post into feedAction
			user.feedAction.push(cat);
			feedIndex = user.feedAction.length - 1;
		}

		// we found the right post, and feedIndex is the right index for it
		console.log(`##### FOUND post ${req.body.postID} at index ${feedIndex}`);

		// create a new Comment
		if (req.body.new_comment) {
			var cat = new Object();
			cat.new_comment = true;
			user.numReplies += 1;
			cat.new_comment_id = user.numReplies;
			cat.comment_body = req.body.comment_text;
			// console.log("Start Time is: "+user.feedAction[feedIndex].startTime);
			// console.log("DATE Time is: "+req.body.new_comment);
			cat.commentTime =
				req.body.new_comment - user.feedAction[feedIndex].startTime;
			// console.log("Comment Time is: "+cat.commentTime);

			// create a new cat.comment id for USER replies here to do actions on them. Empty now

			cat.absTime = Date.now();
			cat.time = cat.absTime - user.createdAt;
			user.feedAction[feedIndex].comments.push(cat);
			user.feedAction[feedIndex].replyTime = [cat.time];
			user.numComments += 1;

			// console.log("$#$#$#$#$#$$New  USER COMMENT Time: ", cat.commentTime);
		}

		// Are we doing anything with a comment?
		else if (req.body.commentID) {
			console.log("We have a comment action");
			let commentIndex = _.findIndex(
				user.feedAction[feedIndex].comments,
				(o) => o.comment == req.body.commentID
			);

			// no comment in this post-actions yet
			if (commentIndex == -1) {
				console.log(
					"@@@@@@@@@@ COMMENT new feedAction Object! at commentID ",
					req.body.commentID
				);
				var cat = new Object();
				cat.comment = req.body.commentID;
				user.feedAction[feedIndex].comments.push(cat);
				// commentIndex = 0;
				commentIndex = user.feedAction[feedIndex].comments.length - 1;
			}

			// LIKE A COMMENT
			if (req.body.like) {
				console.log("Comment ID is  ", commentIndex);
				const like = req.body.like - user.feedAction[feedIndex].startTime;
				console.log("!!!!!!New FIRST COMMENT LIKE Time: ", like);
				if (user.feedAction[feedIndex].comments[commentIndex].likeTime) {
					user.feedAction[feedIndex].comments[commentIndex].likeTime.push(like);
				} else {
					user.feedAction[feedIndex].comments[commentIndex].likeTime = [like];
					console.log(
						"!!!!!!!adding FIRST COMMENT LIKE time [0] now which is  ",
						user.feedAction[feedIndex].likeTime[0]
					);
				}
				user.feedAction[feedIndex].comments[commentIndex].liked = true;
				user.numCommentLikes++;
			}

			// FLAG A COMMENT
			else if (req.body.flag) {
				const flag = req.body.flag - user.feedAction[feedIndex].startTime;
				console.log("!!!!!!New FIRST COMMENT flag Time: ", flag);
				if (user.feedAction[feedIndex].comments[commentIndex].flagTime) {
					user.feedAction[feedIndex].comments[commentIndex].flagTime.push(flag);
				} else {
					user.feedAction[feedIndex].comments[commentIndex].flagTime = [flag];
					// console.log("!!!!!!!adding FIRST COMMENT flag time [0] now which is  ", user.feedAction[feedIndex].flagTime[0]);
				}
				user.feedAction[feedIndex].comments[commentIndex].flagged = true;
			}
		} // end of all comment junk

		// not a comment - its a post action
		else {
			// array of flagTime is empty and we have a new (first) Flag event
			if (
				!user.feedAction[feedIndex].flagTime &&
				req.body.flag &&
				req.body.flag > user.feedAction[feedIndex].startTime
			) {
				const flag = req.body.flag - user.feedAction[feedIndex].startTime;
				console.log("!!!!!New FIRST FLAG Time: ", flag);
				user.feedAction[feedIndex].flagTime = [flag];
				// console.log("!!!!!adding FIRST FLAG time [0] now which is  ", user.feedAction[feedIndex].flagTime[0]);
			}

			// Already have a flagTime Array, New FLAG event, need to add this to flagTime array
			else if (
				user.feedAction[feedIndex].flagTime &&
				req.body.flag &&
				req.body.flag > user.feedAction[feedIndex].startTime
			) {
				const flag = req.body.flag - user.feedAction[feedIndex].startTime;
				console.log("%%%%%Add new FLAG Time: ", flag);
				user.feedAction[feedIndex].flagTime.push(flag);
			}

			// array of likeTime is empty and we have a new (first) LIKE event
			else if (
				!user.feedAction[feedIndex].likeTime &&
				req.body.like &&
				req.body.like > user.feedAction[feedIndex].startTime
			) {
				const like = req.body.like - user.feedAction[feedIndex].startTime;
				console.log("!!!!!!New FIRST LIKE Time: ", like);
				user.feedAction[feedIndex].likeTime = [like];
				user.feedAction[feedIndex].liked = true;
				user.numPostLikes++;
				// console.log("!!!!!!!adding FIRST LIKE time [0] now which is  ", user.feedAction[feedIndex].likeTime[0]);
			}

			// Already have a likeTime Array, New LIKE event, need to add this to likeTime array
			else if (
				user.feedAction[feedIndex].likeTime &&
				req.body.like &&
				req.body.like > user.feedAction[feedIndex].startTime
			) {
				const like = req.body.like - user.feedAction[feedIndex].startTime;
				console.log("%%%%%Add new LIKE Time: ", like);
				user.feedAction[feedIndex].likeTime.push(like);
				if (user.feedAction[feedIndex].liked) {
					user.feedAction[feedIndex].liked = false;
					user.numPostLikes--;
				} else {
					user.feedAction[feedIndex].liked = true;
					user.numPostLikes++;
				}
			}

			// array of replyTime is empty and we have a new (first) REPLY event
			else if (
				!user.feedAction[feedIndex].replyTime &&
				req.body.reply &&
				req.body.reply > user.feedAction[feedIndex].startTime
			) {
				const reply = req.body.reply - user.feedAction[feedIndex].startTime;
				// console.log("!!!!!!!New FIRST REPLY Time: ", reply);
				user.feedAction[feedIndex].replyTime = [reply];
				// console.log("!!!!!!!adding FIRST REPLY time [0] now which is  ", user.feedAction[feedIndex].replyTime[0]);
			}

			// Already have a replyTime Array, New REPLY event, need to add this to replyTime array
			else if (
				user.feedAction[feedIndex].replyTime &&
				req.body.reply &&
				req.body.reply > user.feedAction[feedIndex].startTime
			) {
				const reply = req.body.reply - user.feedAction[feedIndex].startTime;
				// console.log("%%%%%Add new REPLY Time: ", reply);
				user.feedAction[feedIndex].replyTime.push(reply);
			} else {
				console.log("Got a POST that did not fit anything. Possible Error.");
			}
		} // else ALL POST ACTIONS IF/ELSES

		// console.log("####### END OF ELSE post at index "+ feedIndex);

		// }//end of else
		// console.log("@@@@@@@@@@@ ABOUT TO SAVE TO DB on Post ", req.body.postID);
		user.save((err) => {
			if (err) {
				if (err.code === 11000) {
					req.flash("errors", {
						msg: "Something in feedAction went crazy. You should never see this.",
					});

					return res.redirect("/");
				}
				console.log("ERROR ON FEED_ACTION SAVE");
				console.log(JSON.stringify(req.body));
				console.log(err);
				return next(err);
			}
			// req.flash('success', { msg: 'Profile information has been updated.' });
			// res.redirect('/account');
			console.log("@@@@@@@@@@@ SAVED TO DB!!!!!!!!! ");
			res.send({ result: "success" });
		});
	});
};

/**
 * POST /pro_feed/
 * Update user's profile feed posts Actions.
 getUserPostByID
 */
exports.postUpdateProFeedAction = (req, res, next) => {
	User.findById(req.user.id, (err, user) => {
		// somehow user does not exist here
		if (err) {
			return next(err);
		}

		console.log("@@@@@@@@@@@ TOP profile of PRO FEED  ", req.body.postID);

		// find the object from the right post in feed
		const feedIndex = _.findIndex(
			user.profile_feed,
			(o) => o.profile == req.body.postID
		);

		console.log("index is  ", feedIndex);

		if (feedIndex == -1) {
			// Profile does not exist yet in User DB, so we have to add it now
			console.log(
				"$$$$$Making new profile_feed Object! at post ",
				req.body.postID
			);
			const cat = new Object();
			cat.profile = req.body.postID;
			if (!req.body.start) {
				console.log(
					"!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!No start"
				);
			}
			cat.startTime = req.body.start;
			cat.rereadTimes = 0;
			// add new post into feedAction
			user.profile_feed.push(cat);
		} else {
			// we found the right post, and feedIndex is the right index for it
			console.log(`##### FOUND post ${req.body.postID} at index ${feedIndex}`);

			// update to new StartTime
			if (
				req.body.start &&
				req.body.start > user.profile_feed[feedIndex].startTime
			) {
				user.profile_feed[feedIndex].startTime = req.body.start;
				user.profile_feed[feedIndex].rereadTimes++;
			}

			// array of readTimes is empty and we have a new READ event
			else if (
				!user.profile_feed[feedIndex].readTime &&
				req.body.read &&
				req.body.read > user.profile_feed[feedIndex].startTime
			) {
				const read = req.body.read - user.profile_feed[feedIndex].startTime;
				// console.log("!!!!!New FIRST READ Time: ", read);
				user.profile_feed[feedIndex].readTime = [read];
				// console.log("!!!!!adding FIRST READ time [0] now which is  ", user.feedAction[feedIndex].readTime[0]);
			}

			// Already have a readTime Array, New READ event, need to add this to readTime array
			else if (
				user.profile_feed[feedIndex].readTime &&
				req.body.read &&
				req.body.read > user.profile_feed[feedIndex].startTime
			) {
				const read = req.body.read - user.profile_feed[feedIndex].startTime;
				// console.log("%%%%%Add new Read Time: ", read);
				user.profile_feed[feedIndex].readTime.push(read);
			}

			// array of picture_clicks is empty and we have a new (first) picture_clicks event
			else if (
				!user.profile_feed[feedIndex].picture_clicks &&
				req.body.picture &&
				req.body.picture > user.profile_feed[feedIndex].startTime
			) {
				const picture =
					req.body.picture - user.profile_feed[feedIndex].startTime;
				console.log("!!!!!New FIRST picture Time: ", picture);
				user.profile_feed[feedIndex].picture_clicks = [picture];
				console.log(
					"!!!!!adding FIRST picture time [0] now which is  ",
					user.profile_feed[feedIndex].picture_clicks[0]
				);
			}

			// Already have a picture_clicks Array, New PICTURE event, need to add this to picture_clicks array
			else if (
				user.profile_feed[feedIndex].picture_clicks &&
				req.body.picture &&
				req.body.picture > user.profile_feed[feedIndex].startTime
			) {
				const picture =
					req.body.picture - user.profile_feed[feedIndex].startTime;
				console.log("%%%%%Add new PICTURE Time: ", picture);
				user.profile_feed[feedIndex].picture_clicks.push(picture);
			} else {
				console.log("Got a POST that did not fit anything. Possible Error.");
			}

			// console.log("####### END OF ELSE post at index "+ feedIndex);
		} // else

		// console.log("@@@@@@@@@@@ ABOUT TO SAVE TO DB on Post ", req.body.postID);
		user.save((err) => {
			if (err) {
				if (err.code === 11000) {
					req.flash("errors", {
						msg: "Something in profile_feed went crazy. You should never see this.",
					});

					return res.redirect("/");
				}
				console.log(err);
				return next(err);
			}
			// req.flash('success', { msg: 'Profile information has been updated.' });
			// res.redirect('/account');
			// console.log("@@@@@@@@@@@ SAVED TO DB!!!!!!!!! ");
			res.send({ result: "success" });
		});
	});
};

/**
 * POST /userPost_comment
 * Create a new comment on a user's post.
 */
exports.postNewCommentOnUserPost = (req, res, next) => {
	User.findById(req.user.id, (err, user) => {
		if (err) {
			return next(err);
		}

		const feedIndex = _.findIndex(user.posts, (o) => o.postID == req.body.postID);
		if (feedIndex === -1) {
			return res.status(404).send({ error: "Post not found." });
		}

		if (req.body.new_comment) {
			const cat = {
				new_comment: true,
				commentID: 900 + user.numReplies, // unique ID for the comment
				body: req.body.comment_text,
				isUser: true,
				absTime: Date.now(),
				time: Date.now() - user.createdAt
			};

			user.numReplies += 1;
			user.posts[feedIndex].comments.push(cat);
			user.save((err) => {
				if (err) { return next(err); }
				res.send({ result: "success", comment: cat });
			});
		} else {
			res.status(400).send({ error: "Invalid request." });
		}
	});
};

/**
 * POST /userPost_feed/
 * Update user's POST feed Actions.
 */
exports.postUpdateUserPostFeedAction = (req, res, next) => {
	User.findById(req.user.id, (err, user) => {
		// somehow user does not exist here
		if (err) {
			return next(err);
		}

		console.log("@@@@@@@@@@@ TOP USER profile is  ", req.body.postID);

		// find the object from the right post in feed
		const feedIndex = _.findIndex(
			user.posts,
			(o) => o.postID == req.body.postID
		);

		console.log("User Posts index is  ", feedIndex);

		if (feedIndex == -1) {
			// User Post does  not exist yet, This is an error
			console.log("$$$$$ERROR: Can not find User POST ID: ", req.body.postID);
		}

		// create a new Comment
		// else if (req.body.new_comment) {
		// 	const cat = new Object();
		// 	cat.new_comment = true;
		// 	user.numReplies += 1;
		// 	cat.commentID = 900 + user.numReplies; // this is so it doesn't get mixed with actor comments
		// 	cat.body = req.body.comment_text;
		// 	cat.isUser = true;
		// 	cat.absTime = Date.now();
		// 	cat.time = cat.absTime - user.createdAt;
		// 	user.posts[feedIndex].comments.push(cat);
		// 	console.log("$#$#$#$#$#$$New  USER COMMENT Time: ", cat.time);
		// }

		// Are we doing anything with a comment?
		else if (req.body.commentID) {
			const commentIndex = _.findIndex(
				user.posts[feedIndex].comments,
				(o) => o.commentID == req.body.commentID
			);

			// no comment in this post-actions yet
			if (commentIndex == -1) {
				console.log("!!!!!!Error: Can not find Comment for some reason!");
			}

			// LIKE A COMMENT
			else if (req.body.like) {
				console.log(
					"%^%^%^%^%^%User Post comments LIKE was: ",
					user.posts[feedIndex].comments[commentIndex].liked
				);
				user.posts[feedIndex].comments[commentIndex].liked =
					!user.posts[feedIndex].comments[commentIndex].liked;
				console.log(
					"^&^&^&^&^&User Post comments LIKE was: ",
					user.posts[feedIndex].comments[commentIndex].liked
				);
			}

			// FLAG A COMMENT
			else if (req.body.flag) {
				console.log(
					"%^%^%^%^%^%User Post comments FLAG was: ",
					user.posts[feedIndex].comments[commentIndex].flagged
				);
				user.posts[feedIndex].comments[commentIndex].flagged =
					!user.posts[feedIndex].comments[commentIndex].flagged;
				console.log(
					"%^%^%^%^%^%User Post comments FLAG was: ",
					user.posts[feedIndex].comments[commentIndex].flagged
				);
			}
		} // end of all comment junk
		else {
			// we found the right post, and feedIndex is the right index for it
			console.log(`##### FOUND post ${req.body.postID} at index ${feedIndex}`);

			// array of likeTime is empty and we have a new (first) LIKE event
			if (req.body.like) {
				console.log("!!!!!!User Post LIKE was: ", user.posts[feedIndex].liked);
				user.posts[feedIndex].liked = !user.posts[feedIndex].liked;
				console.log(
					"!!!!!!User Post LIKE is now: ",
					user.posts[feedIndex].liked
				);
			} else {
				console.log("Got a POST that did not fit anything. Possible Error.");
			}
		} // else

		// console.log("@@@@@@@@@@@ ABOUT TO SAVE TO DB on Post ", req.body.postID);
		user.save((err) => {
			if (err) {
				if (err.code === 11000) {
					req.flash("errors", {
						msg: "Something in profile_feed went crazy. You should never see this.",
					});

					return res.redirect("/");
				}
				console.log(err);
				return next(err);
			}
			// req.flash('success', { msg: 'Profile information has been updated.' });
			// res.redirect('/account');
			// console.log("@@@@@@@@@@@ SAVED TO DB!!!!!!!!! ");
			res.send({ result: "success" });
		});
	});
};
