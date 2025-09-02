# Lifecycle Manager

Manages the clean startup and shutdown of a process. Register lifecycle components in the order they will be initialized, and then call `start()` on the lifecycle. When the lifecycle manager receives a SIGTERM or if the `close()` method is called, it will begin the shutdown process. The lifecycle manager closes each component in the reverse order of their registration