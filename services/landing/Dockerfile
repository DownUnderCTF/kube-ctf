# container image is probably a bit heavy for the purpose but whatever
# even though its around 10mb
FROM nginx:alpine

COPY default.conf /etc/nginx/conf.d/default.conf
COPY files/ /usr/share/nginx/html

# remove the main index file and reduce the number of workers
RUN rm /usr/share/nginx/html/index.html && \
    sed -i 's/worker_processes  auto/worker_processes  2/g' /etc/nginx/nginx.conf