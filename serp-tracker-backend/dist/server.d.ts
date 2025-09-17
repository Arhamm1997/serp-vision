declare class Server {
    private app;
    private port;
    constructor();
    private initializeMiddleware;
    private initializeRoutes;
    private initializeErrorHandling;
    start(): Promise<void>;
    private setupGracefulShutdown;
}
export default Server;
//# sourceMappingURL=server.d.ts.map