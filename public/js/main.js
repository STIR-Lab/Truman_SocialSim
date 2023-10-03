// $(document).ready(function() {

// Before Page load:
$("#content").hide();
$("#loading").show();

$(window).on("load", () => {
	// close loading dimmer on load
	$("#loading").hide();
	$("#content").attr("style", "block");
	$("#content").fadeIn("slow");
	// close messages from flash message
	$(".message .close").on("click", function () {
		$(this).closest(".message").transition("fade");
	});

	// check bell
	if (
		!(top.location.pathname === "/login" || top.location.pathname === "/signup")
	) {
		$.getJSON("/bell", (json) => {
			if (json.result) {
				$("i.big.alarm.icon").replaceWith(
					'<i class="big icons"><i class="red alarm icon"></i><i class="corner yellow lightning icon"></i></i>'
				);
			}
		});
	}

	// make checkbox work
	$(".ui.checkbox").checkbox();

	$(" .ui.tiny.post.modal").modal({
		observeChanges: true,
	});

	// get add new feed post modal to work
	$("#newpost, a.item.newpost").click(() => {
		$(" .ui.tiny.post.modal").modal("show");
	});

	// new post validator (picture and text can not be empty)
	$(".ui.feed.form").form({
		on: "blur",
		fields: {
			body: {
				identifier: "body",
				rules: [
					{
						type: "empty",
						prompt: "Please add some text about your meal",
					},
				],
			},
			picinput: {
				identifier: "picinput",
				rules: [
					{
						type: "notExactly[/public/photo-camera.svg]",
						prompt: "Please click on Camera Icon to add a photo",
					},
				],
			},
		},

    onSuccess: function (event, fields) {
      console.log("Event is :", event);
      //console.log(event);
      console.log("fields is :", fields.body);
      //console.log(fields);
      $(".ui.feed.form")[0].submit();
    },
  });

	$(".ui.feed.form").submit((e) => {
		e.preventDefault();
		console.log("Submit the junks!!!!");
		// $('.ui.tiny.nudge.modal').modal('show');
		// return true;
	});

	// Picture Preview on Image Selection
	function readURL(input) {
		if (input.files && input.files[0]) {
			const reader = new FileReader();
			// console.log("Now changing a photo");
			reader.onload = function (e) {
				$("#imgInp").attr("src", e.target.result);
				// console.log("FILE is "+ e.target.result);
			};

			reader.readAsDataURL(input.files[0]);
		}
	}

	$("#picinput").change(function () {
		// console.log("@@@@@ changing a photo");
		readURL(this);
	});

	// Modal to show "other users" in Notifications
	/*
$('a.others').click(function(){
  let key = $(this).attr('key');

  $('.ui.long.extrausers.modal#'+key).modal({
    onVisible: function() {
      var el = document.querySelector('.ui.long.extrausers.modal#'+key+" div.ui.extra.divided.items");
      var lazyLoad = new LazyLoad({
         container: el /// <--- not sure if this works here, read below
    });

    }
  }).modal('show')
}); */

	// add humanized time to all posts
	$(".right.floated.time.meta, .date").each(function () {
		const ms = parseInt($(this).text(), 10);
		const time = new Date(ms);
		$(this).text(humanized_time_span(time));
	});

	// Sign Up Button
	$(".ui.big.green.labeled.icon.button.signup").on("click", () => {
		window.location.href = "/signup";
	});

	// Sign Up Info Skip Button
	$("button.ui.button.skip").on("click", () => {
		window.location.href = "/com";
	});

	// Community Rules Button (rocket!!!)
	$(".ui.big.green.labeled.icon.button.com").on("click", () => {
		window.location.href = "/info"; // maybe go to tour site???
	});

	// Community Rules Button (rocket!!!)
	$(".ui.big.green.labeled.icon.button.info").on("click", () => {
		window.location.href = "/"; // maybe go to tour site???
	});

	// Profile explaination Page
	$(".ui.big.green.labeled.icon.button.profile").on("click", () => {
		window.location.href = "/profile_info"; // maybe go to tour site???
	});

	// More info Skip Button
	$("button.ui.button.skip").on("click", () => {
		window.location.href = "/com"; // maybe go to tour site???
	});

  //Edit button
  $(".ui.editprofile.button").on("click", function () {
    window.location.href = "/account";
  });





	/// /////////////////
	$("input.newcomment").keyup(function (event) {
		// i.big.send.link.icon
		// $(this).siblings( "i.big.send.link.icon")
		if (event.keyCode === 13) {
			$(this).siblings("i.big.send.link.icon").click();
		}
	});

	// create a new Comment
	$("i.big.send.link.icon").click(function () {
		const text = $(this).siblings("input.newcomment").val();
		const card = $(this).parents(".ui.fluid.card");
		var comments = card.find(".ui.comments");
		// no comments area - add it
		console.log(`Comments is now ${comments.length}`);
		if (!comments.length) {
			// .three.ui.bottom.attached.icon.buttons
			console.log("Adding new Comments sections");
			const buttons = card.find(".three.ui.bottom.attached.icon.buttons");
			buttons.after('<div class="content"><div class="ui comments"></div>');
			var comments = card.find(".ui.comments");
		}
		if (text.trim() !== "") {
			console.log(text);
			const date = Date.now();
			const ava = $(this).siblings(".ui.label").find("img.ui.avatar.image");
			const ava_img = ava.attr("src");
			const ava_name = ava.attr("name");
			const postID = card.attr("postID");

			const mess = `<div class="comment"> <a class="avatar"> <img src="${ava_img}"> </a> <div class="content"> <a class="author">${ava_name}</a> <div class="metadata"> <span class="date">${humanized_time_span(
				date
			)}</span> <i class="heart icon"></i> 0 Likes </div> <div class="text">${text}</div> <div class="actions"> <a class="like">Like</a> <a class="flag">Flag</a> </div> </div> </div>`;
			$(this).siblings("input.newcomment").val("");
			comments.append(mess);
			console.log(
				`######### NEW COMMENTS:  PostID: ${postID}, new_comment time is ${date} and text is ${text}`
			);

			if (card.attr("type") == "userPost") {
				$.post("/userPost_feed", {
					postID,
					new_comment: date,
					comment_text: text,
					_csrf: $('meta[name="csrf-token"]').attr("content"),
				});
				console.log("Comment COMPLETED userPOST_FEED");
			} else {
				$.post("/feed", {
					postID,
					new_comment: date,
					comment_text: text,
					_csrf: $('meta[name="csrf-token"]').attr("content"),
				});
				console.log("Comment COMPLETED normal feed");
			}
		}
	});
	/// ////////////////

	// this is the REPORT User button
	$("button.ui.button.report").on("click", function () {
		const username = $(this).attr("username");

		$(".ui.small.report.modal").modal("show");

		$(".coupled.modal").modal({
			allowMultiple: false,
		});
		// attach events to buttons
		$(".second.modal").modal("attach events", ".report.modal .button");
		// show first now
		$(".ui.small.report.modal").modal("show");
	});

	// Report User Form//
	$("form#reportform").submit(function (e) {
		e.preventDefault();
		$.post($(this).attr("action"), $(this).serialize(), (res) => {
			// Do something with the response `res`
			console.log(res);
			// Don't forget to hide the loading indicator!
		});
		// return false; // prevent default action
	});

	$(".ui.home.inverted.button").on("click", () => {
		window.location.href = "/";
	});

	// this is the Block User button
	$("button.ui.button.block").on("click", function () {
		const username = $(this).attr("username");
		// Modal for Blocked Users
		$(".ui.small.basic.blocked.modal")
			.modal({
				closable: false,
				onDeny() {
					// report user
				},
				onApprove() {
					// unblock user
					$.post("/user", {
						unblocked: username,
						_csrf: $('meta[name="csrf-token"]').attr("content"),
					});
				},
			})
			.modal("show");

    console.log("***********Block USER " + username);
    $.post("/user", {
      blocked: username,
      _csrf: $('meta[name="csrf-token"]').attr("content"),
    });
    
  });

	// Block Modal for User that is already Blocked
	$(".ui.on.small.basic.blocked.modal")
		.modal({
			closable: false,
			onDeny() {
				// report user
			},
			onApprove() {
				// unblock user
				const username = $("button.ui.button.block").attr("username");
				$.post("/user", {
					unblocked: username,
					_csrf: $('meta[name="csrf-token"]').attr("content"),
				});
			},
		})
		.modal("show");

  // //this is the Add Friend button
  // $("button.ui.button.friend").on("click", function () {
  //   console.log("clicked!!!! " + username);
  //   var username = $(this).attr("username");
  //   //Modal for Friending Feature
  //   $(".ui.small.basic.friend.modal")
  //     .modal({
  //       closable: false,
  //       onDeny: function () {
  //         //report user
  //       },
  //       onApprove: function () {
  //         //unfriend user
  //         $.post("/user", {
  //           unfriended: username,
  //           _csrf: $('meta[name="csrf-token"]').attr("content"),
  //         });
  //       },
  //     })
  //     .modal("show");

  //   console.log("***********Friend USER " + username);
  //   $.post("/user", {
  //     friended: username,
  //     _csrf: $('meta[name="csrf-token"]').attr("content"),
  //   });
  // });

  $("button.ui.button.friend").on("click", function () {
    var username = $(this).attr("username");
  
    // Request sent modal
    $(".ui.small.basic.request.sent.modal")
      .modal('show');
  
    console.log("Sending friend request to " + username);
  
    // After 5 seconds, simulate the request being accepted
    setTimeout(function() {
      // Show request accepted modal
      $(".ui.small.basic.request.accepted.modal")
        .modal('show');
  
      console.log("Friend request accepted by " + username);
  
      // Add friend
      $.post("/user", {
        friended: username,
        _csrf: $('meta[name="csrf-token"]').attr('content'),
      });
    }, 5000); 
  });

  //Friend Modal for User that is already Friended
  // $(".ui.on.small.basic.friend.modal")
  //   .modal({
  //     closable: false,
  //     onDeny: function () {
  //       //report user
  //     },
  //     onApprove: function () {
  //       //unfriend user
  //       var username = $("button.ui.button.friend").attr("username");
  //       $.post("/user", {
  //         unfriended: username,
  //         _csrf: $('meta[name="csrf-token"]').attr("content"),
  //       });
  //     },
  //   })
  //   .modal("show");




  //this is the LIKE button
  $(".like.button").on("click", function () {
    //if already liked, unlike if pressed
    if ($(this).hasClass("red")) {
      console.log("***********UNLIKE: post");
      $(this).removeClass("red");
      var label = $(this).next("a.ui.basic.red.left.pointing.label.count");
      label.html(function (i, val) {
        return val * 1 - 1;
      });
    }
    //since not red, this button press is a LIKE action
    else {
      $(this).addClass("red");
      var label = $(this).next("a.ui.basic.red.left.pointing.label.count");
      label.html(function (i, val) {
        return val * 1 + 1;
      });
      var postID = $(this).closest(".ui.fluid.card").attr("postID");
      var like = Date.now();
      console.log("***********LIKE: post " + postID + " at time " + like);

			if ($(this).closest(".ui.fluid.card").attr("type") == "userPost") {
				$.post("/userPost_feed", {
					postID,
					like,
					_csrf: $('meta[name="csrf-token"]').attr("content"),
				});
			} else {
				$.post("/feed", {
					postID,
					like,
					_csrf: $('meta[name="csrf-token"]').attr("content"),
				});
			}
		}
	});

	// a.like.comment
	$("a.like.comment").on("click", function () {
		// if already liked, unlike if pressed
		if ($(this).hasClass("red")) {
			console.log("***********UNLIKE: post");
			// Un read Like Button
			$(this).removeClass("red");

			var comment = $(this).parents(".comment");
			comment.find("i.heart.icon").removeClass("red");

			var label = comment.find("span.num");
			label.html((i, val) => val * 1 - 1);
		}
		// since not red, this button press is a LIKE action
		else {
			$(this).addClass("red");
			var comment = $(this).parents(".comment");
			comment.find("i.heart.icon").addClass("red");

			var label = comment.find("span.num");
			label.html((i, val) => val * 1 + 1);

			const postID = $(this).closest(".ui.fluid.card").attr("postID");
			const commentID = comment.attr("commentID");
			const like = Date.now();
			console.log(
				`#########COMMENT LIKE:  PostID: ${postID}, Comment ID: ${commentID} at time ${like}`
			);

			if ($(this).closest(".ui.fluid.card").attr("type") == "userPost") {
				$.post("/userPost_feed", {
					postID,
					commentID,
					like,
					_csrf: $('meta[name="csrf-token"]').attr("content"),
				});
			} else {
				$.post("/feed", {
					postID,
					commentID,
					like,
					_csrf: $('meta[name="csrf-token"]').attr("content"),
				});
			}
		}
	});

	// this is the FLAG button
	$("a.flag.comment").on("click", function () {
		const comment = $(this).parents(".comment");
		const postID = $(this).closest(".ui.fluid.card").attr("postID");
		const typeID = $(this).closest(".ui.fluid.card").attr("type");
		const commentID = comment.attr("commentID");
		comment.replaceWith(
			'<div class="comment" style="background-color:black;color:white"><h5 class="ui inverted header"><span>The admins will review this post further. We are sorry you had this experience.</span></h5></div>'
		);
		const flag = Date.now();
		console.log(
			`#########COMMENT FLAG:  PostID: ${postID}, Comment ID: ${commentID}  TYPE is ${typeID} at time ${flag}`
		);

		if (typeID == "userPost") {
			$.post("/userPost_feed", {
				postID,
				commentID,
				flag,
				_csrf: $('meta[name="csrf-token"]').attr("content"),
			});
		} else {
			$.post("/feed", {
				postID,
				commentID,
				flag,
				_csrf: $('meta[name="csrf-token"]').attr("content"),
			});
		}
	});

	// this is the POST FLAG button
	$(".flag.button").on("click", function () {
		const post = $(this).closest(".ui.fluid.card.dim");
		const postID = post.attr("postID");
		const flag = Date.now();
		console.log(`***********FLAG: post ${postID} at time ${flag}`);
		$.post("/feed", {
			postID,
			flag,
			_csrf: $('meta[name="csrf-token"]').attr("content"),
		});
		console.log("Removing Post content now!");
		post
			.find(".ui.dimmer.flag")
			.dimmer({
				closable: false,
			})
			.dimmer("show");
		// repeat to ensure its closable
		post
			.find(".ui.dimmer.flag")
			.dimmer({
				closable: false,
			})
			.dimmer("show");
	});

	// User wants to REREAD
	$(".ui.button.reread").on("click", function () {
		// .ui.active.dimmer
		$(this).closest(".ui.dimmer").removeClass("active");
		$(this)
			.closest(".ui.fluid.card.dim")
			.find(".ui.inverted.read.dimmer")
			.dimmer("hide");

		const postID = $(this).closest(".ui.fluid.card.dim").attr("postID");
		const reread = Date.now();
		console.log(
			`##########REREAD######SEND TO DB######: post ${postID} at time ${reread}`
		);
		$.post("/feed", {
			postID,
			start: reread,
			_csrf: $('meta[name="csrf-token"]').attr("content"),
		});
		// maybe send this later, when we have a re-read event to time???
		// $.post( "/feed", { postID: postID, like: like, _csrf : $('meta[name="csrf-token"]').attr('content') } );
	});


	/*
	// Check if the comment nudge modal exists, if so then open it
	if ($("#commentNudgeModal").length) {
		$("#commentNudgeModal").modal('setting', 'closable', false).modal('show');
	}
	*/
	/*
	// check if nudge responded property exists on a comment and nudgeShown is true, if so open the comment nudge modal
	$(".comment").each(function () {
		if ($(this).attr("nudgeResponded") == 'false' && $(this).attr("nudgeShown") == 'true') {
			$('#commentNudgeModal').modal('setting', 'closable', false).modal('show');
		}
	})
	*/

	// First Modal Buttons
	// onclick icon close button
	$("#closeModalCommentNudgeIconButton").on("click", function () {
		// close the main modal
		// make api req
		console.log('CLOSE MODAL FOR COMMENT NUDGE')
		// get the postID and commentID from the modal
		const postID = $("#commentNudgeModal").attr('postnudgeID')
		const commentID = $("#commentNudgeModal").attr('commentNudgeID')
		const userAction = 'unhide'
		console.log(
		  `#########COMMENT NUDGE:  PostID: ${postID}, Comment ID: ${commentID} with ${userAction}`
		)
		
		$.post("/commentnudge/reaction", {
		  postID,
		  commentID,
		  userAction,
		  _csrf: $('meta[name="csrf-token"]').attr("content"),
		}).then(function(response) {
			location.reload();
		});
		
	})

	// onclick unhide button
	$("#unhideCommentNudge").on("click", function () {
		console.log('UNHIDE MODAL FOR COMMENT NUDGE')
		// get the postID and commentID from the modal
		const postID = $("#commentNudgeModal").attr('postnudgeID')
		const commentID = $("#commentNudgeModal").attr('commentNudgeID')
		const userAction = 'unhide'
		console.log(
		  `#########COMMENT NUDGE:  PostID: ${postID}, Comment ID: ${commentID} with ${userAction}`
		)
		$.post("/commentnudge/reaction", {
			postID,
			commentID,
			userAction,
			_csrf: $('meta[name="csrf-token"]').attr("content"),
		  }).then(function(response) {
			location.reload();
		  });  
	})

	// onclick hide button
	$("#hideCommentNudge").on("click", function () {
		console.log('UNHIDE MODAL FOR COMMENT NUDGE')
		// get the postID and commentID from the modal
		const postID = $("#commentNudgeModal").attr('postnudgeID')
		const commentID = $("#commentNudgeModal").attr('commentNudgeID')
		const userAction = 'hide'
		console.log(
		  `#########COMMENT NUDGE:  PostID: ${postID}, Comment ID: ${commentID} with ${userAction}`
		)
		$.post("/commentnudge/reaction", {
			postID,
			commentID,
			userAction,
			_csrf: $('meta[name="csrf-token"]').attr("content"),
		  }).then(function(response) {
			location.reload();
		  });
		  
	})

	// onclick block button
	$("#blockCommentNudge").on("click", function () {
		// block user model
		const username = $("#commentNudgeModal").attr('actorID');
		console.log("***********Block USER " + username);
		$.post("/user", {
			blocked: username,
			_csrf: $('meta[name="csrf-token"]').attr("content"),
		});
		// open up the secondary modal
		$("#secondaryReportCommentModal").modal('setting', 'closable', false).modal('show');
		console.log("debug 1");
	})

	// Secondary Modal Buttons
	// onclick secondary close button
	$("#closeReportModalCommentNudgeIconButton").on("click", function () {
		console.log('UNHIDE MODAL FOR COMMENT NUDGE')
		// get the postID and commentID from the modal
		const postID = $("#commentNudgeModal").attr('postnudgeID')
		const commentID = $("#commentNudgeModal").attr('commentNudgeID')
		const comment_id = $("#commentNudgeModal").attr('comment_id')
		const userAction = 'block'
		console.log(
		  `#########COMMENT NUDGE:  PostID: ${postID}, Comment ID: ${commentID} with ${userAction}`
		)

		$.post("/commentnudge/reaction", {
			postID,
			commentID,
			userAction,
			_csrf: $('meta[name="csrf-token"]').attr("content"),
		  }).then(function(response) {
			location.reload();
		  });
		  
	})

	// onclick secondary report button
	$("#reportCommentNudge").on("click", function () {
		console.log('UNHIDE MODAL FOR COMMENT NUDGE')
		// get the postID and commentID from the modal
		const postID = $("#commentNudgeModal").attr('postnudgeID')
		const commentID = $("#commentNudgeModal").attr('commentNudgeID')
		const userAction = 'blockAndReport'
		console.log(
		  `#########COMMENT NUDGE:  PostID: ${postID}, Comment ID: ${commentID} with ${userAction}`
		)
		$.post("/commentnudge/reaction", {
			postID,
			commentID,
			userAction,
			_csrf: $('meta[name="csrf-token"]').attr("content"),
		  }).then(function(response) {
			location.reload();
		  });
		  
	})

	// onclick secondary don't report button
	$("#dontReportCommentNudge").on("click", function () {
		console.log('UNHIDE MODAL FOR COMMENT NUDGE')
		// get the postID and commentID from the modal
		const postID = $("#commentNudgeModal").attr('postnudgeID')
		const commentID = $("#commentNudgeModal").attr('commentNudgeID')
		const userAction = 'block'
		console.log(
		  `#########COMMENT NUDGE:  PostID: ${postID}, Comment ID: ${commentID} with ${userAction}`
		)
		$.post("/commentnudge/reaction", {
			postID,
			commentID,
			userAction,
			_csrf: $('meta[name="csrf-token"]').attr("content"),
		  }).then(function(response) {
			location.reload();
		  });
		  
	})

	  // this is Unhide on the hidden COMMENT NUDGE button
	  $("a.unhide.commentnudge").on("click", function () {
		console.log('VIEW COMMENT for NUDGE CLICKED')
	
		var comment = $(this).parents(".comment");
			const postID = $(this).closest(".ui.fluid.card").attr("u_postid");
			const commentID = comment.attr("commentnudgeid");
		const userAction = 'unhide'
		console.log(
		  `#########COMMENT NUDGE:  PostID: ${postID}, Comment ID: ${commentID} with ${userAction}`
		)
		
		$.post("/commentnudge/reaction", {
		  postID,
		  commentID,
		  userAction,
		  _csrf: $('meta[name="csrf-token"]').attr("content"),
		}).then(function(response) {
			location.reload();
		});
		
		});
/*
  // Remove these once done with them
  // this is VIEW COMMENT NUDGE button
  $("a.view.commentnudge").on("click", function () {
    console.log('VIEW COMMENT for NUDGE CLICKED')

    var comment = $(this).parents(".comment");
		const postID = $(this).closest(".ui.fluid.card").attr("u_postid");
		const commentID = comment.attr("commentnudgeid");
    const userAction = 'view'
    console.log(
      `#########COMMENT NUDGE:  PostID: ${postID}, Comment ID: ${commentID} with ${userAction}`
    )
    $.post("/commentnudge/reaction", {
      postID,
      commentID,
      userAction,
      _csrf: $('meta[name="csrf-token"]').attr("content"),
    }).then(location.reload());
	});

  // this is DELETE COMMENT NUDGE button
  $("a.delete.commentnudge").on("click", function () {
    console.log('VIEW DELETE for NUDGE CLICKED')

    var comment = $(this).parents(".comment");
		const postID = $(this).closest(".ui.fluid.card").attr("u_postid");
		const commentID = comment.attr("commentnudgeid");
    const userAction = 'delete'

    console.log(
      `#########COMMENT NUDGE:  PostID: ${postID}, Comment ID: ${commentID} with ${userAction}`
    )
    $.post("/commentnudge/reaction", {
      postID,
      commentID,
      userAction,
      _csrf: $('meta[name="csrf-token"]').attr("content"),
    }).then(location.reload());
  })
  
  // a.report.commentnudge
  $("a.report.commentnudge").on("click", function () {
    console.log('VIEW REPORT for NUDGE CLICKED')
    
    var comment = $(this).parents(".comment");
		const postID = $(this).closest(".ui.fluid.card").attr("u_postid");
		const commentID = comment.attr("commentnudgeid");
    const userAction = 'report'

    console.log(
      `#########COMMENT NUDGE:  PostID: ${postID}, Comment ID: ${commentID} with ${userAction}`
    )
    $.post("/commentnudge/reaction", {
      postID,
      commentID,
      userAction,
      _csrf: $('meta[name="csrf-token"]').attr("content"),
    }).then(location.reload());
  })
*/
	/// ///TESTING
	/* setTimeout(function() {
  //.ui.fluid.card.test
    $('.ui.fluid.card.test .content.read')
      .transition({
        animation: 'fade down',
        duration   : '1.5s',
      });
      }.bind(this), 1500);

  //Dimm cards as user scrolls - send Post to update DB on timing of events .image
  //$('.ui.fluid.card.dim') img.post $('.ui.fluid.card.dim .image'
  /*
  $('img.post.s3, .content.pro.s3')
  .visibility({
    once       : false,
    continuous : false,
    observeChanges: true,
    //throttle:100,
    offset: 250,

    //USER HAS NOW READ THE POST (READ EVENT)
    //onBottomVisibleReverse:function(calculations) { onBottomPassed
      onBottomPassed:function(calculations) {
        console.log(":::::Now passing onBottomPassed:::::");
        var parent = $(this).parents(".ui.fluid.card.dim, .profile_card");

        //As Post is not READ and We have a transparency condistion - Show Read Conent and send Post READ event
        if ((!(parent.attr( "state" )=='read')) && (parent.attr( "transparency" )=='yes'))
        {
          console.log("::::UI passing::::Adding Seen Box Now::::::::");

          var postID = parent.attr( "postID" );
          var read = Date.now();

          //actual show the element

           parent.find('.read')
            .transition({
              animation: 'fade',
              duration   : '1.5s',
            });
          //$('img.post').visibility('refresh')  $('img.post, .content.pro').visibility('refresh')
          //<div style="text-align:center;background:#b5bfce" class="content read"> <p>You've read this!</p><a href="/user/"><img src="/profile_pictures/" class="ui avatar image"><span>cat</span></a> has been notified.</div>
          //parent.append( '<div style="text-align:center;background:#b5bfce" class="content read"> <p>You have read this!</p><a href="/user/'+parent.attr( "actor_un" )+'"><img src="/profile_pictures/'+parent.attr( "actor_pic" )+'" class="ui avatar image"><span>'+parent.attr( "actor_name" )+'</span></a> has been notified.</div>' );
          parent.attr( "state", "read" );
          console.log("::::UI passing::::SENDING POST TO DB::::::::");
          $.post( "/feed", { postID: postID, read: read, _csrf : $('meta[name="csrf-token"]').attr('content') } );

        }

        //if we are not in UI condistion, and we are reading, then send off Post to DB for new Read Time
        //Maybe kill this so we don't fill the DB with all this stuff. Seems kind of silly (or only do like 10, etc)
        //else if ((parent.attr( "ui" )=='no') && (parent.attr( "state" )=='unread'))

        //Need to get all "read" and "start" times in non-UI case (as all other times rests on it)
        else if ((parent.attr( "transparency" )=='no'))
        {
          console.log("::::NO UI passing:::");
          //console.log("::::first time reading -> UNREAD:::");
          var postID = parent.attr( "postID" );
          var read = Date.now();
          //set to read now
          //parent.attr( "state" , "read");

          //send post to server to update DB that we have now read this
          console.log("::::NO UI :::::READ::::SENDING POST TO DB:::::::POST:"+postID+" at time "+read);
          if (parent.attr( "profile" )=="yes")
            $.post( "/pro_feed", { postID: postID, read: read, _csrf : $('meta[name="csrf-token"]').attr('content') } );
          else
            $.post( "/feed", { postID: postID, read: read, _csrf : $('meta[name="csrf-token"]').attr('content') } );
        }

        //UI and DIMMED READ, which does not count as a READ
        else
          {console.log("::::passing::::Already dimmed - do nothing - transparency is now "+parent.attr( "transparency" ));}

      },

    ////POST IS NOW Visiable - START EVENT
    onBottomVisible:function(calculations) {
        console.log("@@@@@@@ Now Seen @@@@@@@@@");
        var parent = $(this).parents(".ui.fluid.card.dim, .profile_card");

        var postID = parent.attr( "postID" );
        var start = Date.now();
        console.log("@@@@@@@ UI!!!! @@@@@@SENDING TO DB@@@@@@START POST UI has seen post "+postID+" at time "+start);
        if (parent.attr( "profile" )=="yes")
          $.post( "/pro_feed", { postID: postID, start: start, _csrf : $('meta[name="csrf-token"]').attr('content') } );
        else
          $.post( "/feed", { postID: postID, start: start, _csrf : $('meta[name="csrf-token"]').attr('content') } );

        }
  })
;//WTF!!!
//lazy loading of images
  $('.img.post img')
  .visibility({
    type       : 'image'
    //offset: 450,
    //transition : 'fade in',
    //duration   : 1000,

  })
;
*/
});
