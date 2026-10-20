#![cfg_attr(windows, windows_subsystem = "windows")]

use std::thread;

use include_dir::{include_dir, Dir};
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder};
use tao::window::{ResizeDirection, Theme, WindowBuilder};
use tiny_http::{Header, Response, Server, StatusCode};
use wry::http::Request;

static UI: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/ui");

enum UserEvent {
    Drag,
    Minimize,
    Maximize,
    Close,
    Resize(ResizeDirection),
}

fn main() {
    if let Err(err) = run() {
        alert(&err);
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let server = Server::http("127.0.0.1:0").map_err(|err| format!("Could not open a local port: {err}"))?;
    let port = match server.server_addr() {
        tiny_http::ListenAddr::IP(addr) => addr.port(),
        _ => return Err("Could not read the local port.".into()),
    };
    thread::spawn(move || serve(server));

    let event_loop = EventLoopBuilder::<UserEvent>::with_user_event().build();
    let mut builder = WindowBuilder::new()
        .with_title("Vellum")
        .with_decorations(false)
        .with_theme(Some(Theme::Dark))
        .with_inner_size(tao::dpi::LogicalSize::new(1200.0, 800.0))
        .with_min_inner_size(tao::dpi::LogicalSize::new(720.0, 520.0));

    #[cfg(target_os = "windows")]
    {
        use tao::platform::windows::WindowBuilderExtWindows;
        builder = builder.with_undecorated_shadow(true);
    }

    let window = builder
        .build(&event_loop)
        .map_err(|err| format!("Could not open a window: {err}"))?;

    let proxy = event_loop.create_proxy();
    let handler = move |req: Request<String>| {
        let body = req.body().as_str();
        let event = if body == "drag" {
            Some(UserEvent::Drag)
        } else if body == "minimize" {
            Some(UserEvent::Minimize)
        } else if body == "maximize" {
            Some(UserEvent::Maximize)
        } else if body == "close" {
            Some(UserEvent::Close)
        } else if let Some(dir) = body.strip_prefix("resize:") {
            resize_dir(dir).map(UserEvent::Resize)
        } else {
            None
        };
        if let Some(event) = event {
            let _ = proxy.send_event(event);
        }
    };

    let webview = wry::WebViewBuilder::new()
        .with_url(format!("http://127.0.0.1:{port}/"))
        .with_background_color((0, 0, 0, 255))
        .with_ipc_handler(handler)
        .build(&window)
        .map_err(|err| format!("Could not open the page. Windows needs the WebView2 runtime. {err}"))?;

    let mut webview = Some(webview);
    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            }
            | Event::UserEvent(UserEvent::Close) => {
                webview.take();
                *control_flow = ControlFlow::Exit;
            }
            Event::UserEvent(UserEvent::Drag) => {
                let _ = window.drag_window();
            }
            Event::UserEvent(UserEvent::Minimize) => window.set_minimized(true),
            Event::UserEvent(UserEvent::Maximize) => window.set_maximized(!window.is_maximized()),
            Event::UserEvent(UserEvent::Resize(direction)) => {
                let _ = window.drag_resize_window(direction);
            }
            _ => {}
        }
    });
}

fn resize_dir(name: &str) -> Option<ResizeDirection> {
    Some(match name {
        "n" => ResizeDirection::North,
        "s" => ResizeDirection::South,
        "e" => ResizeDirection::East,
        "w" => ResizeDirection::West,
        "nw" => ResizeDirection::NorthWest,
        "ne" => ResizeDirection::NorthEast,
        "sw" => ResizeDirection::SouthWest,
        "se" => ResizeDirection::SouthEast,
        _ => return None,
    })
}

fn serve(server: Server) {
    for request in server.incoming_requests() {
        let url = request.url().split('?').next().unwrap_or("/");
        let mut path = url.trim_start_matches('/');
        if path.is_empty() {
            path = "index.html";
        }
        if path.contains("..") {
            let _ = request.respond(Response::empty(StatusCode(400)));
            continue;
        }
        let Some(file) = UI.get_file(path) else {
            let _ = request.respond(Response::empty(StatusCode(404)));
            continue;
        };
        let header = Header::from_bytes("Content-Type", mime(path)).expect("content type");
        let response = Response::from_data(file.contents()).with_header(header);
        let _ = request.respond(response);
    }
}

fn mime(path: &str) -> &'static str {
    if path.ends_with(".html") {
        "text/html; charset=utf-8"
    } else if path.ends_with(".js") || path.ends_with(".mjs") {
        "text/javascript; charset=utf-8"
    } else if path.ends_with(".css") {
        "text/css; charset=utf-8"
    } else if path.ends_with(".svg") {
        "image/svg+xml"
    } else if path.ends_with(".png") {
        "image/png"
    } else if path.ends_with(".jpg") || path.ends_with(".jpeg") {
        "image/jpeg"
    } else if path.ends_with(".woff2") {
        "font/woff2"
    } else if path.ends_with(".json") {
        "application/json"
    } else {
        "application/octet-stream"
    }
}

fn alert(message: &str) {
    #[cfg(windows)]
    {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;
        let wide = |text: &str| -> Vec<u16> {
            OsStr::new(text).encode_wide().chain(std::iter::once(0)).collect()
        };
        let text = wide(message);
        let title = wide("Vellum");
        #[link(name = "user32")]
        extern "system" {
            fn MessageBoxW(hwnd: isize, text: *const u16, caption: *const u16, flags: u32) -> i32;
        }
        unsafe {
            MessageBoxW(0, text.as_ptr(), title.as_ptr(), 0x10);
        }
    }
    #[cfg(not(windows))]
    {
        eprintln!("{message}");
    }
}
