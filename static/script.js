class SignupAndLogin extends React.Component {
  constructor(props) {
    super(props);
    this.onLogIn = this.onLogIn.bind(this)
  }

  onLogIn(email, username) {
    this.props.handleLogIn(email, username);
  }
 
  signup = () => {
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;
    let email = document.getElementById("email").value;

    fetch("http://127.0.0.1:5000/api/signup", {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, username, password})
    }).then((response) => {
      if (response.status === 200) {
        response.json().then((data) => {
        alert("Created user "+username);
        this.onLogIn(email, username)
    })
      } else if (response.status === 302){
        alert("Database configured incorrectly");
      } else if (response.status === 303){
        alert("There is already an account using the provided email")
      }
    })
    .catch(e =>
      alert("An error occurred ")
      )
    }

  login = () => {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    fetch("http://127.0.0.1:5000/api/login", {
      method: "POST",
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password})
    }).then((response) => {
      if (response.status === 200) {
        response.json().then((data) => {
          const username = data.username
          alert("Logged in as "+username);
          this.onLogIn(email, username)
          })
        } else if (response.status === 300){
          alert("Incorrect password");
        } else if (response.status === 302){
          alert("Incorrect database configuration")
        } else if (response.status === 303){
          alert("Provided email is not in the system")
        }
      })
      .catch(e =>
        alert("An error occurred ")
        )
      }

  render() {
    return (
      <div className="signup"> 
        <h2>Signup and Login</h2>
        <div className="signup_form">
          <label htmlFor="email">Email</label>
          <input id="email" type="email"></input>
          <label htmlFor="password">Password</label>
          <input id="password" type="password"></input>
          <button className="form_button" onClick={this.login}>
            Login
          </button>
          <label htmlFor="username">Username</label>
          <input id="username"></input>
          <button className="form_button" onClick={this.signup}>
            Signup
          </button>
        </div>
      </div>
    );
  }
}

class LoggedIn extends React.Component {
  constructor(props) {
    super(props);
    this.onLogOut = this.onLogOut.bind(this)
    this.channelsList = React.createRef();
    this.state = {
      username : this.props.username
    };
  }

  createChannel (){
    let channelName = document.getElementById("channel").value;
    fetch("http://127.0.0.1:5000/api/create", {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({channelName, username: this.state.username})
    }).then((response) => {
      if (response.status === 200) {
        alert("Created channel "+channelName)
        this.channelsList.current.getChannels();
      } else if (response.status === 302){
        alert("Database configured incorrectly");
      } else if (response.status === 303){
        alert("There is already a channel with that name")
      } else if(response.status === 403){
        alert("Your session has expired, please log out and log back in.")
      } else if (response.status === 404){
        alert("Session does not exist. Please log in or sign up.")
      }
    })
    .catch(e =>
      alert("An error occurred ")
      )
    }

  onLogOut() {
    this.props.handleLogOut();
  }

  changeNameEmail = () => {
    let name = document.getElementById("changeName").value;
    let email = document.getElementById("changeEmail").value;
    if (!name && !email){
      alert("You must enter input for your field.")
      return
    } else if (name && email) {
      alert("Please only enter input for one field at a time.")
      return
    }
    fetch("http://127.0.0.1:5000/api/change_name_email", {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name, email, user: this.state.username})
    }).then((response) => {
    if (response.status === 200) {
      let alertMsg = name ? `Display Name changed to ${name}` : `Email changed to ${email}`
      alert(alertMsg)
      name ? this.setState({username:name}) : null
    } else if (response.status === 302){
      alert("Database configured incorrectly")
    } else if(response.status === 403){
      alert("Your session has expired, please log out and log back in.")
    } else if (response.status === 404){
      alert("Session does not exist. Please log in or sign up.")
    } else if (response.status === 401){
      let alertMsg = name ? `Display Name ${name} already exists, try another` : `Email ${email} is already in the system, try another.`
      alert(alertMsg)
    }
  })
}

  render () {
    return (
      <React.Fragment>
    <div className='infoBar'>
    <div className="displayName"><b>{this.state.username}'s channels</b></div>
    <div>
      <label id='channelLabel' htmlFor="createChannel">Create Channel: </label>
      <input id="channel" type="channel"></input>
      <button onClick={() => {this.createChannel();}}>Submit</button>
    </div>
    <div className="dropdown">
      <button className="dropbtn">Account Management</button>
      <div className="dropdown-content">
        <div className='flex-down dropForm'>
          <p className='username'>{this.state.username}</p>
        </div>
        <div className='flex-down dropForm'>
          <input id='changeName'/><button onClick={() => {this.changeNameEmail();}}>Change Display Name</button>
        </div>
        <div className='flex-down dropForm'>
          <input id='changeEmail'/><button onClick={() => {this.changeNameEmail();}}>Change Email</button>
        </div>
      </div>
  </div>
  <div><button className='logOut' onClick={() => {this.onLogOut();}}>log out</button></div>
    </div>
      <Channels username={this.state.username} ref={this.channelsList} />
    </React.Fragment>
    )
  }
}

class Channels extends React.Component {
  constructor(props) {
    super(props);
    this.getChannels()
    this.newMsgCount = this.newMsgCount.bind(this);
    this.callChat = this.callChat.bind(this);
    this.updateChannels = this.updateChannels.bind(this);
    this.removeDisplay  = this.removeDisplay.bind(this);
  this.state = {
    channels: [],
    displayChat : false,
    channelId:false,
    creator:null,
    channelName:null
    }
  }

  getChannels() {
    let channelHeaders = new Headers();
    channelHeaders.append("Accept", "application/json");
    channelHeaders.append("username", this.props.username);
    const myInit = {
      method: "GET",
      headers: channelHeaders,
    }
    let getChannels  = fetch("http://127.0.0.1:5000/api/channels", myInit)
    getChannels.then(response => response.json())
    .then(data => {
      this.setState({ channels:data })
    })
  }
  newMsgCount (count) {
    if (count === 0)  return ""
    return ": " + count
    }
  
  callChat(channelId, creator, channelName) {
    this.setState({displayChat:true, channelId, creator, channelName})
    history.pushState(null, channelName, "http://127.0.0.1:5000/channel_name=" + channelName)
  }

  updateChannels() {
    this.getChannels()
  }

  removeDisplay () {
    this.setState({displayChat: false})
  }

  render () {
    return (
      <div className='chatInfoContainer'>
      <div className='channels column list'>
        {this.state.channels.map(channel => 
        <p className='chatSumm' key={channel.channel_id} 
        onClick={() => this.callChat(channel.channel_id, channel.creator, channel.channel_name)}><b>
          {channel.channel_name}{this.newMsgCount(channel.new_messages)}</b></p>)}
      </div>
      {this.state.displayChat ?
          <Chat key={this.state.channelId} channel={this.state.channelId} updateChannels={this.updateChannels} 
          removeDisplay={this.removeDisplay} channelName={this.state.channelName} creator={this.state.creator} 
          username={this.props.username}/> :
          null}
        </div>
    );
  }
}

class Chat extends React.Component {
  constructor(props) {
    super(props);
    this.getChats()
    this.channelCount = this.channelCount.bind(this)
    this.removeChat = this.removeChat.bind(this)
    this.hideReplies = this.hideReplies.bind(this)
    this.parsePost = this.parsePost.bind(this)
    this.switchThread = React.createRef();
    this.state= {
      chats: [],
      displayReplies: false,
      message_id: null,
      href: window.location.href,
      newMsgs:null
    }
  }

  componentDidMount() {
    this.interval = setInterval(() => this.getChats(), 5000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  channelCount() {
    this.props.updateChannels();
  }

  removeChat() {
    this.props.removeDisplay();
    history.pushState(null, 'back home', "http://127.0.0.1:5000/")
  }
  
  getChats() {
    let chatHeader = new Headers();
    chatHeader.append("Accept", "application/json");
    chatHeader.append("channel_id", this.props.channel);
    chatHeader.append("username", this.props.username);
    const myInit = {
      method: "GET",
      headers: chatHeader,
    }
    let getChats  = fetch("http://127.0.0.1:5000/api/chats", myInit);
    getChats.then(response => response.json())
    .then(data => {
      const chats = data['chats']
      const newMsgs = data['newMsgs']
      this.setState({ chats, newMsgs })
      this.channelCount();
    })
  }

  postChat() {
    let content = document.getElementById("content").value;
    fetch("http://127.0.0.1:5000/api/post_msg", {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({content, 
        "channel_id":this.props.channel, username:this.props.username})
    }).then((response) => {
      if (response.status === 200) {
        document.getElementById("content").value = "";
        this.displayNewMsgs()
    } else if(response.status === 403){
      alert("Your session has expired, please log out and log back in.")
    } else if (response.status === 404){
      alert("Session does not exist. Please log in or sign up.")
    } else {
      alert("something went wrong")
    }
  })
}
  
  replies(count, msg_id) {
    if (count === 1) return <p onClick= {() => {this.showReplies(msg_id);}} className='reply postReply'><em>1 reply</em></p>
    return <p onClick= {() => {this.showReplies(msg_id);}} className='reply postReply'><em>{count} replies</em></p>
  }

  showReplies(message_id) {
    if (this.state.displayReplies){
      this.switchThread.current.getReplies()
    } 
    this.setState({displayReplies:true, message_id})
    let chat = document.body.getElementsByClassName("channelChat")[0]
    chat.style.width = "50%";
    history.pushState(null, "thread: " + message_id, this.state.href + "/" + message_id)
  }

  hideReplies() {
    this.setState({displayReplies:false, message_id:null})
    let chat = document.body.getElementsByClassName("channelChat")[0]
    chat.style.width = "70%";
    history.pushState(null, 'back to' + this.props.channelName, this.state.href)
  }

  deleteChat() {
    let channel = this.props.channel
    let username = this.props.username
    fetch("http://127.0.0.1:5000/api/delete", {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({channel, username})
    }).then((response) => {
      if (response.status === 200) {
        response.json().then((data) => {
          this.getChats()
          this.removeChat();
        })}
      else if(response.status === 403){
        alert("Your session has expired, please log out and log back in.")
      } else if (response.status === 404){
        alert("Session does not exist. Please log in or sign up.")
      } else {
        alert("Database configured incorrectly")
      }})
}
  parsePost(message_id, author, body, replies ) {
      return (
      <div key={message_id} className='post'>
      {body.match(/\.(jpeg|jpg|gif|png)$/) != null 
      ? <React.Fragment><b>{author}</b><a href={body}>{body}</a><img src={body} className='imgEmbed'></img></React.Fragment> 
      : <React.Fragment><b>{author}</b>{body}</React.Fragment>}
      {replies ? this.replies(replies, message_id) : <p onClick={() => {this.showReplies(message_id);}} className='postReply'>Post reply</p>}
      </div>
      )    
  }

  displayNewMsgs() {
    const channel = this.props.channel
    const username = this.props.username
    fetch("http://127.0.0.1:5000/api/last_read", {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({channel, username})
    }).then((response) => {
    if (response.status === 200) {
      this.getChats()
    } else if (response.status === 302){
      alert("Database configured incorrectly")
    } else if(response.status === 403){
      alert("Your session has expired, please log out and log back in.")
    } else if (response.status === 404){
      alert("Session does not exist. Please log in or sign up.")
    }
  })
  }

  newMsgButton () {
    return (
      this.state.newMsgs ?
      <button onClick={() => this.displayNewMsgs()}>View {this.state.newMsgs} New Messages</button> :
      null
      )}

  render () {
    return (
      <React.Fragment>
    <div className='channelChat column'>
      <div className='flex-down delete'>
      <p className='exitChat' onClick={() => this.removeChat()}>X</p>
      {this.props.creator === this.props.username ?
      <button onClick={() => {this.deleteChat();}}>Delete Chat</button> :
      null}
      </div>
      <h3 className='chanTitle'>{this.props.channelName}</h3>
      {this.state.chats.map(chat => 
      this.parsePost(chat.message_id, chat.author, chat.body, chat.replies))}
      <br></br><br></br>
      <div className='comment_box'>
          {this.newMsgButton()}
          <textarea id='content' className='words'></textarea>
          <button onClick={() => {this.postChat();}}>Post</button>
      </div>
      </div>
      {this.state.displayReplies ? 
      <Replies message={this.state.message_id} key={this.props.channel} channel={this.props.channel} 
      refresh={this.channelCount} hideReplies={this.hideReplies} username={this.props.username} 
      ref={this.switchThread}/> : 
    null}
    </React.Fragment>
    )
  }
}


class Replies extends React.Component {
  constructor(props) {
    super(props);
    this.hideWindow = this.hideWindow.bind(this);
    this.refresh = this.refresh.bind(this);
    this.getReplies()
    this.state = {
      replies: [],

    }
  }

  getReplies() {
    let repliesHeader = new Headers();
    repliesHeader.append("Accept", "application/json");
    repliesHeader.append("message_id", this.props.message);
    repliesHeader.append("username", this.props.username);
    const myInit = {
      method: "GET",
      headers: repliesHeader,
    }
    let getReplies  = fetch("http://127.0.0.1:5000/api/replies", myInit);
    getReplies.then((response) => {
      if (response.status === 200){
        response.json().then(data => {
          this.setState({ replies: data })
        })}
      else if(response.status === 403){
        alert("Your session has expired, please log out and log back in.")
      } else if (response.status === 404){
        alert("Session does not exist. Please log in or sign up.")
      } else if (response.status === 302){
        alert("Database configured incorrectly.")
      }
    })
  }

  hideWindow() {
    this.props.hideReplies()
  }

  refresh() {
    this.props.refresh();
  }

  postReply() {
    let content = document.getElementById("reply").value;
    fetch("http://127.0.0.1:5000/api/post_reply", {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({content, message:this.props.message, 
        username:this.props.username})
    }).then((response) => {
      if (response.status === 200) {
        document.getElementById("reply").value = "";
        this.getReplies();
        this.refresh()
    } else if (response.status === 403){
      alert("Your session has expired, please log out and log back in.")
    } else if (response.status === 404){
      alert("Session does not exist. Please log in or sign up.")
    } else {
      alert("something went wrong")
    }
  })
}

  render() {
    return (
    <div className='column replies'>
      <div onClick={() => {this.hideWindow();}} className='exitReply'>X</div>
      {this.state.replies.map(thread => 
      <div key={thread.message_id} className='post'>
      <b>{thread.author}:</b>{thread.body} </div>)}
      <textarea id='reply' className='words'></textarea>
      <button onClick={() => {this.postReply();}}>Reply</button>
    </div>
    )
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.handleLogIn = this.handleLogIn.bind(this);
    this.handleLogOut = this.handleLogOut.bind(this);
    this.state = {
      loggedIn: false,
      username: "",
      email: ""
    };
  }

  handleLogIn (email, username) {
    this.setState({ loggedIn : true, email, username })
  }
  handleLogOut () {
    this.setState({ loggedIn : false })
  }

  render () {
    {if (!this.state.loggedIn){
      return <SignupAndLogin handleLogIn={this.handleLogIn}/>
    } else{
      return <LoggedIn handleLogOut={this.handleLogOut} username={this.state.username}/>
    }}
}
}

// ========================================

ReactDOM.render(
    <App/>,
  document.getElementById('root')
);
