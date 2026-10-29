# -*- coding: utf-8 -*-
from . import controllers
from . import models


def post_init_hook(env):
    env['website']._craviont_bootstrap()
