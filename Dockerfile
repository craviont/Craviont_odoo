# Odoo 19 + Craviont website, tuned for Render.
FROM odoo:19.0

USER root
# Not /mnt/extra-addons: the base image declares it as a VOLUME, which can
# keep serving stale code when a container is recreated.
COPY --chown=odoo:odoo addons /opt/craviont/addons
COPY --chown=odoo:odoo docker/boot.py /opt/craviont/boot.py
RUN chmod 0755 /opt/craviont/boot.py \
    && find /opt/craviont/addons -name "__pycache__" -prune -exec rm -rf {} +
USER odoo

ENV PORT=10000
EXPOSE 10000

# boot.py answers health checks right away, prepares the database/modules,
# then replaces itself with the Odoo server.
ENTRYPOINT ["python3", "/opt/craviont/boot.py"]
