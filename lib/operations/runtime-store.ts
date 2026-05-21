type DeliveryTask = {
  id: number;
  client: string;
  location: string;
  action: string;
  status: string;
  created_at: string;
};

let deliveryTasks: DeliveryTask[] = [];

export function getTasks() {
  return deliveryTasks;
}

export function updateTask(id: number, updates: Partial<DeliveryTask>) {
  deliveryTasks = deliveryTasks.map((task) =>
    task.id === id ? { ...task, ...updates } : task
  );

  return deliveryTasks.find((task) => task.id === id);
}

export function addTask(task: DeliveryTask) {
  deliveryTasks.push(task);
  return task;
}