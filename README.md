# Raymond Eid
## Web Dev Final Project

### Introduction

As a capstone project for Web Development, we're going to combine the various
front-end and back-end techniques we've learned over the course to produce a
modern, database-backed single-page application. Specifically, we'll be building
our own (significantly smaller in scope) version of the popular workplace
messaging app Slack. We'll call our version [Belay](https://en.wikipedia.org/wiki/Belaying).

### Requirements

- Belay lets users send and read real-time chat messages that are organized
  into rooms called Channels. Users see a list of all the channels on the server
  and can click one to enter that channel. Inside, they see all the messages
  posted to that channel by any user, and can post their own messages.
  All messages belong to a channel and all channels are visible to all users; we
  don't need to implement private rooms or direct messages.
- Channel names are unique strings of numbers, letters, and underscores (and no
  spaces). Any user can create a new channel, and the user who created a channel
  can delete it and all messages.
- Like Slack, messages may be threaded as Replies in response to a message in a
  channel. Messages in the channel will display how many replies they have if
  that number is greater than zero. Like in Slack, clicking will open the reply
  thread alongside the current messages in the channel, changing the screen from
  a 2-column layout to a 3-column layout. We don't support nested threads;
  messages either belong directly to a channel or are replies in a thread to a
  message that does, but replies can't have nested replies of their own.
- Like Slack, if a message contains any URLs that point to [valid image formats](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#Supported_image_formats),
  display the images in the chat at the bottom of the message. Unlike Slack,
  we won't support uploading images from the user's computer.
- The channel display shows the number of unread messages in each channel (so
  somewhere you'll have to track the id of the most recent message a user has
  seen in each channel).
- Belay should use responsive styling to render reasonably in a phone browser.
  In particular, on mobile devices, when a user is not in a channel they should
  see the list of channels, and when they are in a channel or in a thread they
  should see just the messages in that channel or thread, with some menu element
  to let them return to the channel list.
- Users should have a display name and an email address, and be able to update
  either in the app. Users authenticate with their email address and a password.
- Belay is a single-page web application. We serve a single HTML request on load
  and do not refresh the page. As users navigate to a channel, the application
  updates the navigation bar to reflect what channel they are in, and navigating
  to the URL for a specific channel opens the single-page application with that
  channel open. You may use Flask's `render_template` to render the page if
  desired.
- Belay automatically sends non-blocking requests to the server to check for new
  channels and new messages in a channel. Like Slack, when it finds new messages
  in a channel, it displays a notification to users in that channel without
  moving the existing messages on the page. Users may click on the notification
  to load the new messages.
- Other than loading the initial page, all interaction with the Belay server is
  handled via JSON API requests. This includes authenticating users, retrieving
  channels and messages, and creating new channels and messages. These requests
  are served by a Flask API.
- All data about users, channels, and messages is stored in a MySQL database. In
  your submission, include a SQL file of commands that can be run to create the
  database and its tables, like [this file](https://mit.cs.uchicago.edu/trevoraustin/mpcs-52553-austin/blob/master/week_8/examples/posts_and_comments/2020-02-24T18:45:00-create_database.sql)
  from Week 3. Start the names of your migration files with [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601)
  datetimes so that graders can run them in order. Make sure when you create
  your database to set it up to handle unicode characters with `CHARACTER SET
  utf8mb4 COLLATE utf8mb4_unicode_ci;`
