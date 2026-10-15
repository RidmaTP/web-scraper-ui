# Web Analyzer UI

React frontend for the Web Analyzer service.

## Run with Docker Compose

From the project directory, start the frontend with:

```powershell
docker compose up --build
```

The `--build` option rebuilds the image so the latest source changes are included. To run it in the background:

```powershell
docker compose up --build -d
```

Open the frontend at:

```text
http://localhost:3800
```

The frontend connects to the backend at:

```text
http://localhost:8000/api/v1/result
```

Make sure the backend is running on port `8000` and allows requests from `http://localhost:3800`.

To stop the containers:

```powershell
docker compose down
```
