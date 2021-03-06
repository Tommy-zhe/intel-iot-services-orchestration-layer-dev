/******************************************************************************
Copyright (c) 2015, Intel Corporation

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of Intel Corporation nor the names of its contributors
      may be used to endorse or promote products derived from this software
      without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*****************************************************************************/
import {History, Link} from "react-router";
import auth from "../lib/auth";
import DlgCreate from "./dlg_create.x";
import DlgOpenGraph from "./ide/dlg_open_graph.x";
import DlgOpenUI from "./ui_ide/dlg_open_ui.x";

function is_wf_ide() {
  return _.startsWith(location.hash, "#/ide/");
}
function is_ui_ide() {
  return _.startsWith(location.hash, "#/ui_ide/");
}

export default React.createClass({

  mixins: [History],

  getInitialState() {
    return {
      app: null,
      create_dlg: false,
      graph_dlg: false,
      ui_dlg: false
    };
  },

  _on_auth_event(e) {
    switch(e.event) {
      case "login":
      case "logout":
        this.forceUpdate();
        break;
    }
  },

  _on_app_event(e) {
    switch(e.event) {
      case "actived":
        this.setState({
          app: e.app
        });
        break;
    }
  },

  _on_create(data, type) {
    var name = data && data.name && data.name.trim();
    if (!name) {
      return $hope.notify("error", __("Invalid name"));
    }

    var app = this.state.app;
    if (type === "Workflow") {
      if (_.find(app.graphs, ["name", name]) || $hope.app.stores.graph.find_view(app.id, name)) {
        return $hope.notify("error", __("This name already exists"));
      }
      var view = $hope.app.stores.graph.create_view(app.id, name, data.description);
      this.history.push(`/ide/${view.id}`);
    }
    else if (type === "User UI") {
      if (_.find(app.uis, ["name", name]) || $hope.app.stores.ui.find_view(app.id, name)) {
        return $hope.notify("error", __("This name already exists"));
      }
      var ui = $hope.app.stores.ui.create_ui(app.id, {
        id: $hope.uniqueId("UI_"),
        name: name,
        description: data.description
      });
      this.history.push(`/ui_ide/${ui.id}`);
    }
  },

  _on_workflow() {
    var app = this.state.app;
    if (is_wf_ide()) {
      if (app.graphs.length <= 1) {
        return;
      }
    }
    else {
      if (app.graphs.length <= 0) {
        return;
      }
      if (app.graphs.length === 1) {
        this.history.replace(`/ide/${app.graphs[0].id}`);
        return;
      }
    }
    this.show_dlg("graph_dlg", true);
  },

  _on_ui() {
    var app = this.state.app;
    if (is_ui_ide()) {
      if (app.uis.length <= 1) {
        return;
      }
    }
    else {
      if (app.uis.length <= 0) {
        return;
      }
      if (app.uis.length === 1) {
        this.history.replace(`/ui_ide/${app.uis[0].id}`);
        return;
      }
    }
    this.show_dlg("ui_dlg", true);
  },

  show_dlg(what, show) {
    this.setState({
      [what]: show
    });
  },

  _on_del_graph(id) {
    $hope.confirm(__("Delete from Server"),
      __("This would delete the workflow deployed on the server. Please make sure this is what you expect!"),
      "warning", () => {
        var app = this.state.app;
        $hope.trigger_action("graph/remove", {
          graphs: [id]
        });
        if (app) {
          _.remove(app.graphs, g => g.id === id);
        }
    });
  },

  _on_del_ui(id) {
    $hope.confirm(__("Delete from Server"), 
      __("This would delete the ui deployed on the server. Please make sure this is what you expect!"),
      "warning", () => {
      var app = this.state.app;
      if (app) {
        if (app.main_ui === id) {
          $hope.trigger_action("app/update/app", {
            id: app.id,
            props: {
              main_ui: ""
            }
          });
        }
        _.remove(app.uis, u => u.id === id);
      }
      $hope.trigger_action("ui/remove", {
        uis: [id]
      });
    });
  },

  _on_open_graph(id) {
    this.history.push(`/ide/${id}`);
  },

  _on_open_ui(id) {
    this.history.push(`/ui_ide/${id}`);
  },

  componentDidMount() {
    $hope.app.stores.app.on("app", this._on_app_event);
    auth.on("auth", this._on_auth_event);
  },

  componentWillUnmount() {
    $hope.app.stores.app.removeListener("app", this._on_app_event);
    auth.removeListener("auth", this._on_auth_event);
  },

  render() {
    var store = $hope.app.stores.ide;
    var app = this.state.app;
    return (
      <div className="hope-nav-bar">
        <Link to={auth.is_logged_in() ? "/app" : "/"}>
          <img src="images/logo.png" style={{
            width: 180,
            height: 45,
            margin: "8px 0 0 60px"
          }}/>
        </Link>

        <div style={{
          position: "absolute",
          top: 16,
          right: $hope.ui_auth_required ? 180 : 120
        }}>
          <a href={location.origin + "/app-dev"} target="_blank">
            {__("Help")}
          </a>
        </div>

        <div style={{
          position: "absolute",
          top: 16,
          right: $hope.ui_auth_required ? 100 : 40
        }}>
          {$hope.ui_user_port &&
            <a href={location.protocol + "//" + location.hostname + ":" + $hope.ui_user_port} target="_blank">
              {__("EndUser")}
            </a>
          }
        </div>

        {app &&
          <div style={{
            position: "absolute",
            top: 16,
            left: store.left_toolbar.width + store.panel.library.width
            }}>
            <button type="button" className="btn" onClick={this.show_dlg.bind(this, "create_dlg", true)}>
              <i className="fa fa-file"/> New
            </button>
            <button type="button" className={"btn" + (is_wf_ide() ? " active" : "")}
                onClick={this._on_workflow}>
              <i className="fa fa-cubes"/> Workflow
            </button>
            <button type="button" className={"btn" + (is_ui_ide() ? " active" : "")}
                onClick={this._on_ui}>
              <i className="fa fa-user"/> User UI
            </button>
          </div>
        }

        <DlgCreate show={this.state.create_dlg}
          onHide={this.show_dlg.bind(this, "create_dlg", false)}
          onClickOpen={this._on_create} />

        <DlgOpenGraph app={app}
          show={this.state.graph_dlg}
          onHide={this.show_dlg.bind(this, "graph_dlg", false)}
          onClickDelete={this._on_del_graph}
          onClickOpen={this._on_open_graph} />

        <DlgOpenUI app={app}
          show={this.state.ui_dlg}
          onHide={this.show_dlg.bind(this, "ui_dlg", false)}
          onClickDelete={this._on_del_ui}
          onClickOpen={this._on_open_ui}/>
      </div>
    );
  }
});

