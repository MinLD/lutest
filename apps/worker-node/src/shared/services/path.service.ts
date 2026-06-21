import path from "node:path";
export interface ResolveProjectPathsInput {
  cwd: string;
  projectPath?: string;
  envProjectPath?: string;
}

export interface ProjectPaths {
  toolRoot: string;
  targetProjectRoot: string;
  tlxDir: string;
  reportDir: string;
  screenshotDir: string;
  graphPath: string;
}
// Logic Functional: Nhận vào input, trả ra object đường dẫn
export const pathService = {
  resolveProjectPaths(input: ResolveProjectPathsInput): ProjectPaths {
    // Bước 1: Quyết định xem dự án nằm ở đâu
    // Nếu người dùng truyền vào projectPath, lấy nó.
    // Nếu không, lấy từ biến môi trường, không có nữa thì lấy thư mục hiện tại ('.')
    const projectPath = input.projectPath ?? input.envProjectPath ?? ".";
    // Bước 2: Tính toán đường dẫn tuyệt đối dựa trên cwd (Current Working Directory)
    // toolRoot: Nơi chứa công cụ Lutest
    const toolRoot = path.resolve(input.cwd);
    // targetProjectRoot: Nơi chứa cái website/dự án ta cần scan
    const targetProjectRoot = path.resolve(input.cwd, projectPath);
    // tlxDir: Thư mục ẩn .tlx nằm bên trong dự án mục tiêu
    const tlxDir = path.join(targetProjectRoot, ".tlx");
    return {
      toolRoot,
      targetProjectRoot,
      tlxDir,
      reportDir: path.join(tlxDir, "reports"),
      screenshotDir: path.join(tlxDir, "screenshots"),
      graphPath: path.join(tlxDir, "graph.json"),
    };
  },
};
    